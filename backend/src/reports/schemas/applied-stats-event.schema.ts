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
  @Prop({ required: true })
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

// Índice único explícito (mismo patrón que MonthlyStats): el cerrojo de
// idempotencia. Mongoose lo sincroniza en startup vía autoIndex; su provisión
// por migración de despliegue queda fuera de este módulo.
AppliedStatsEventSchema.index({ key: 1 }, { unique: true });
