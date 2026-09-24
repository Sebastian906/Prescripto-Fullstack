import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MonthlyStatsPatientDocument = HydratedDocument<MonthlyStatsPatient>;

/**
 * Spill de `MonthlyStats.uniquePatientIds` más allá de 5000.
 * Un documento por (docId, year, month, patientId).
 * Espejo Mongo de la tabla PG `monthly_stats_patients`.
 */
@Schema({ collection: 'monthly_stats_patients', timestamps: true })
export class MonthlyStatsPatient {
  @Prop({ required: true })
  docId!: string;

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true })
  month!: number;

  @Prop({ required: true })
  patientId!: string;
}

export const MonthlyStatsPatientSchema =
  SchemaFactory.createForClass(MonthlyStatsPatient);

MonthlyStatsPatientSchema.index(
  { docId: 1, year: 1, month: 1, patientId: 1 },
  { unique: true },
);
// Sin índice extra en { docId, year, month }: el prefijo del compuesto único
// ya cubre esas consultas (regla de prefijos de MongoDB).
