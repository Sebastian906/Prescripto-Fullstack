import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  Availability,
  AvailabilityDocument,
} from './schemas/availability.schema';

// defaults 10:00-21:00 every 30m = 22 slots. Enforced atomically via
// 'slots.21 exists == full'. Confirm with product before tuning.
export const MAX_SLOTS_PER_DAY = 22;

export function normalizeSlotDate(raw: string): string {
  const unified = raw.replace(/\//g, '_');
  const parts = unified.split('_');
  if (parts.length !== 3) return unified;
  const [day, month, year] = parts;
  if (!/^\d+$/.test(day) || !/^\d+$/.test(month) || !/^\d+$/.test(year))
    return unified;
  return `${Number(day)}_${Number(month)}_${year}`;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async claimSlot(
    doctorId: string,
    rawDate: string,
    slotTime: string,
    session?: ClientSession,
  ): Promise<{ claimed: boolean; reason?: 'taken' | 'capped' }> {
    const date = normalizeSlotDate(rawDate);
    let claimed: unknown = null;
    let aborted = false;
    try {
      claimed = await this.availabilityModel
        .findOneAndUpdate(
          {
            doctorId,
            date,
            slots: { $ne: slotTime },
            [`slots.${MAX_SLOTS_PER_DAY - 1}`]: { $exists: false },
          },
          {
            $addToSet: { slots: slotTime },
            $setOnInsert: { doctorId, date },
          },
          { upsert: true, new: true, session },
        )
        .lean();
    } catch (err) {
      // Carrera de upserts concurrentes sobre el mismo {doctorId, date}:
      // el perdedor recibe E11000. Se clasifica abajo como taken/capped
      // en vez de romper la reserva con un 500. Otros errores se propagan.
      if ((err as { code?: number })?.code !== 11000) throw err;
      aborted = true;
    }
    if (claimed) return { claimed: true };
    // Tras un E11000 la transacción queda abortada: el fallback DEBE leer
    // sin session (el ganador ya commiteó). Con tx viva se usa la session.
    const query = this.availabilityModel
      .findOne({ doctorId, date })
      .select('slots');
    const existing =
      session && !aborted
        ? await query.session(session).lean()
        : await query.lean();
    const slots = existing?.slots ?? [];
    if (slots.includes(slotTime)) return { claimed: false, reason: 'taken' };
    if (slots.length >= MAX_SLOTS_PER_DAY)
      return { claimed: false, reason: 'capped' };
    return { claimed: false, reason: 'taken' };
  }

  async releaseSlot(
    doctorId: string,
    rawDate: string,
    slotTime: string,
    session?: ClientSession,
  ): Promise<void> {
    const date = normalizeSlotDate(rawDate);
    await this.availabilityModel.updateOne(
      { doctorId, date },
      { $pull: { slots: slotTime } },
      { session },
    );
  }

  async getBookedSlots(doctorId: string, rawDate: string): Promise<string[]> {
    const date = normalizeSlotDate(rawDate);
    const doc = await this.availabilityModel
      .findOne({ doctorId, date })
      .select('slots')
      .lean();
    return doc?.slots ?? [];
  }
}
