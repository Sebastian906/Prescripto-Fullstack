import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  OutboxEventName,
  OutboxPayload,
} from 'src/shared/ports/outbox.port';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ collection: 'outbox' })
export class OutboxEvent {
  // Explicit `type: String` is required: a union (OutboxEventName) reflects as
  // design:type Object, which @nestjs/mongoose rejects without a concrete type.
  @Prop({
    required: true,
    type: String,
    enum: ['booked', 'cancelled', 'completed'],
  })
  event!: OutboxEventName;

  // IDs + timestamps only. Object maps to Mixed, mirroring the repo's
  // `userData: Object` pattern; the compile-time shape is OutboxPayload.
  @Prop({ required: true, type: Object })
  payload!: OutboxPayload;

  @Prop({ type: Date, default: null })
  dispatchedAt!: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

// Worker poll (Phase 4): FIFO over undispatched rows.
OutboxEventSchema.index({ dispatchedAt: 1, createdAt: 1 });