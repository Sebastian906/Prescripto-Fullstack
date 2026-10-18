import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppliedStatsEventDocument = HydratedDocument<AppliedStatsEvent>;

/**
 * Ledger de eventos de stats ya aplicados (idempotency keys de la saga).
 * `key` = `<type>:<appointmentId>` (p.ej. `booked:<id>`, `booked_decrement:<id>`).
 * El índice único sobre `key` es el cerrojo: el insert gana una sola vez por
 * clave, así una re-entrega aborta la tx (E11000) sin re-incrementar la tabla DP.
 * Un doc por EVENTO aplicado; no por bucket (eso es monthly_stats).
 */
@Schema({ collection: 'applied_stats_events', timestamps: true })
export class AppliedStatsEvent {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  appointmentId!: string;

  @Prop({ required: true, type: String, enum: ['booked', 'booked_decrement'] })
  type!: 'booked' | 'booked_decrement';

  @Prop({ type: Date, default: Date.now })
  appliedAt!: Date;
}

export const AppliedStatsEventSchema =
  SchemaFactory.createForClass(AppliedStatsEvent);
