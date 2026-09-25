import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WaitlistDocument = HydratedDocument<Waitlist>;
export type WaitlistStatus = 'waiting' | 'promoted' | 'cancelled';

@Schema({ timestamps: true })
export class Waitlist {
  @Prop({ required: true, index: true })
  doctorId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  wantedDate!: Date;

  @Prop({ required: true })
  slotDateKey!: string;

  @Prop({ required: true })
  slotTime!: string;

  @Prop({ required: true, default: 'waiting', enum: ['waiting', 'promoted', 'cancelled'] })
  status!: WaitlistStatus;

  @Prop({ type: Date, default: null })
  promotedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);

// FIFO: cola por doctor+fecha ordenada por llegada.
WaitlistSchema.index({ doctorId: 1, slotDateKey: 1, createdAt: 1 });
// GET /mine del usuario.
WaitlistSchema.index({ userId: 1, createdAt: -1 });
// Un usuario, una espera activa por doctor+fecha.
WaitlistSchema.index(
  { doctorId: 1, slotDateKey: 1, userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'waiting' } },
);
// Expiración 30d tras unirse (2592000s), sobre createdAt por decisión FASE A-5.
WaitlistSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });