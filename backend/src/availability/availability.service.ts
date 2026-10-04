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
  return raw.replace(/\//g, '_');
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
    const claimed = await this.availabilityModel
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
    if (claimed) return { claimed: true };
    const existing = await this.availabilityModel
      .findOne({ doctorId, date })
      .select('slots')
      .lean();
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
