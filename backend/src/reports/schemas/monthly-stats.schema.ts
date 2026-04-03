import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MonthlyStatsDocument = HydratedDocument<MonthlyStats>;

/**
 * Tabla de tabulación DP.
 * Cada documento representa un subproblema ya resuelto: las métricas
 * de un (doctor, año, mes) o del sistema global (docId = '__global__').

 * La clave compuesta (docId, year, month) actúa como índice en la
 * tabla DP: dp[docId][year][month] = { earnings, appointments, patients }

 * Al agregar/cancelar/completar una cita se hace un upsert atómico
 * con $inc, lo que garantiza consistencia sin transacciones extra.
 */
@Schema({ timestamps: true })
export class MonthlyStats {
    // '__global__' para métricas del sistema; docId real para métricas por doctor 
    @Prop({ required: true })
    docId: string;

    @Prop({ required: true })
    year: number;

    @Prop({ required: true })
    month: number; // 1-12

    @Prop({ default: 0 })
    totalAppointments: number;

    @Prop({ default: 0 })
    completedAppointments: number;

    @Prop({ default: 0 })
    cancelledAppointments: number;

    @Prop({ default: 0 })
    earnings: number;

    // Set serializado como array para evitar subdocumentos variables 
    @Prop({ type: [String], default: [] })
    uniquePatientIds: string[];

    @Prop({ default: 0 })
    uniquePatients: number;
}

export const MonthlyStatsSchema = SchemaFactory.createForClass(MonthlyStats);
