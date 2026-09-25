import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types, isValidObjectId } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { Waitlist, WaitlistDocument } from './schemas/waitlist.schema';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';

// Clave canónica D_M_YYYY sin zero-pad (igual que BookAppointmentDto y dateToSlotKey con '_' ).
export function toSlotDateKey(d: Date): string {
  return `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`;
}

// Deriva "HH:MM AM/PM": 00-11 -> AM, 12-23 -> PM. Formato consistente con generateDaySlots.
export function toSlotTime(d: Date): string {
  return d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(Waitlist.name)
    private readonly waitlistModel: Model<WaitlistDocument>,
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  async join(
    userId: string,
    dto: CreateWaitlistDto,
  ): Promise<{ success: boolean; entry: WaitlistDocument }> {
    if (!isValidObjectId(dto.doctorId))
      throw new BadRequestException('Invalid doctorId');
    const wanted = new Date(dto.wantedDate);
    if (Number.isNaN(wanted.getTime()))
      throw new BadRequestException('Invalid wantedDate');
    if (wanted.getTime() <= Date.now())
      throw new BadRequestException('wantedDate must be in the future');

    const doctor = await this.doctorModel
      .findById(dto.doctorId)
      .select('_id')
      .lean();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const slotDateKey = toSlotDateKey(wanted);
    const slotTime = toSlotTime(wanted);

    const existing = await this.waitlistModel
      .findOne({
        doctorId: dto.doctorId,
        slotDateKey,
        userId,
        status: 'waiting',
      })
      .lean();
    if (existing)
      throw new ConflictException('Already waiting for this doctor and date');

    try {
      const created = await this.waitlistModel.create([
        {
          doctorId: dto.doctorId,
          userId,
          wantedDate: wanted,
          slotDateKey,
          slotTime,
          status: 'waiting',
        },
      ]);
      return { success: true, entry: created[0] };
    } catch (err: unknown) {
      // Carrera entre el findOne previo y el índice único parcial:
      // el otro join ganó; se traduce a 409 igual que el duplicado.
      if ((err as { code?: number }).code === 11000)
        throw new ConflictException('Already waiting for this doctor and date');
      throw err;
    }
  }

  async leave(userId: string, id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid id');
    // Transición atómica: solo waiting -> cancelled. Las promovidas
    // conservan su reserva y se liberan por el flujo de cancelación.
    const updated = await this.waitlistModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId, status: 'waiting' },
      { $set: { status: 'cancelled' } },
      { new: true },
    );
    if (updated) return { success: true };
    const entry = await this.waitlistModel.findById(id).lean();
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.userId !== userId)
      throw new ForbiddenException('Not your waitlist entry');
    if (entry.status === 'promoted')
      throw new BadRequestException(
        'Entry already promoted; cancel the reservation instead',
      );
    return { success: true };
  }

  async listMine(
    userId: string,
  ): Promise<{ success: boolean; entries: WaitlistDocument[] }> {
    const entries = await this.waitlistModel
      .find({ userId, status: { $in: ['waiting', 'promoted'] } })
      .sort({ createdAt: 1 })
      .lean();
    return { success: true, entries: entries };
  }

  // Reclamación FIFO atómica: debe llamarse DENTRO de la misma session/tx de cancel.
  // El filtro status:'waiting' + sort createdAt:1 hace la reclamación mutuamente excluyente.
  async promoteEarliest(
    doctorId: string,
    slotDateKey: string,
    slotTime: string,
    session: ClientSession,
  ): Promise<WaitlistDocument | null> {
    return this.waitlistModel.findOneAndUpdate(
      { doctorId, slotDateKey, status: 'waiting' },
      { $set: { status: 'promoted', promotedAt: new Date(), slotTime } },
      { sort: { createdAt: 1 }, session, new: true },
    );
  }
}
