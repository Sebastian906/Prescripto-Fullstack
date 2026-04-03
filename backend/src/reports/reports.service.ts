import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MonthlyStats, MonthlyStatsDocument } from './schemas/monthly-stats.schema';
import { Model } from 'mongoose';

// Constante para métricas globales del sistema
export const GLOBAL_DOC_ID = '__global__';

/**
 * DP Tabulación — contrato de mutación.
 * Cualquier servicio que altere el estado de una cita llama a estos métodos.
 * La tabla dp[docId][year][month] se actualiza con $inc atómico en MongoDB,
 * lo que garantiza correctitud incluso bajo concurrencia (no necesita lock).
 */
@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(MonthlyStats.name) private readonly statsModel: Model<MonthlyStatsDocument>,
    ) { }

    /**
     * Registra una nueva cita en la tabla DP.
     * Se llama desde AppointmentsService.bookAppointment().
     * Actualiza tanto la fila del doctor como la fila global.
     */
    async onAppointmentBooked(
        docId: string,
        userId: string,
        amount: number,
        date: Date,
    ): Promise<void> {
        const { year, month } = this.extractYearMonth(date);
        await Promise.all([
            this.incrementStats(docId, year, month, {
                totalAppointments: 1,
                patientId: userId,
            }),
            this.incrementStats(GLOBAL_DOC_ID, year, month, {
                totalAppointments: 1,
                patientId: userId,
            }),
        ]);
    }

    /**
     * Registra completación de cita.
     * El ingreso se acredita al completarse (igual que la lógica actual
     * en getDoctorDashboard que suma amount si isCompleted || payment).
     */
    async onAppointmentCompleted(
        docId: string,
        userId: string,
        amount: number,
        date: Date,
    ): Promise<void> {
        const { year, month } = this.extractYearMonth(date);
        await Promise.all([
            this.incrementStats(docId, year, month, {
                completedAppointments: 1,
                earnings: amount,
            }),
            this.incrementStats(GLOBAL_DOC_ID, year, month, {
                completedAppointments: 1,
                earnings: amount,
            }),
        ]);
    }

    /**
     * Registra cancelación.
     * No revierte earnings (la cita aún no se había completado).
     */
    async onAppointmentCancelled(
        docId: string,
        date: Date,
    ): Promise<void> {
        const { year, month } = this.extractYearMonth(date);
        await Promise.all([
            this.incrementStats(docId, year, month, {
                cancelledAppointments: 1,
            }),
            this.incrementStats(GLOBAL_DOC_ID, year, month, {
                cancelledAppointments: 1,
            }),
        ]);
    }

    /**
     * Reporte anual completo para un doctor o el sistema global.
     *
     * Programación Dinámica — Tabulación bottom-up:
     * 1. Recupera los 12 subproblemas ya resueltos: O(12) = O(1)
     * 2. Construye la tabla de acumulados mes a mes: O(12) = O(1)
     * 3. El resultado es un array de 12 filas con running totals
     *
     * Sin DP: habría que hacer find() sobre todas las citas del año → O(n)
     */
    async getAnnualReport(docId: string, year: number): Promise<{
        success: boolean;
        report: AnnualReportRow[];
        totals: AnnualTotals;
    }> {
        const rows = await this.statsModel
            .find({ docId, year })
            .sort({ month: 1 })
            .lean();

        // Tabla DP: inicializar los 12 meses con ceros
        const dp: AnnualReportRow[] = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            monthLabel: MONTH_LABELS[i],
            totalAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            earnings: 0,
            uniquePatients: 0,
            // Acumulados rolling (tabulación)
            cumulativeEarnings: 0,
            cumulativeAppointments: 0,
        }));

        // Rellenar con datos reales (O(k) donde k <= 12)
        for (const row of rows) {
            const idx = row.month - 1;
            dp[idx].totalAppointments = row.totalAppointments;
            dp[idx].completedAppointments = row.completedAppointments;
            dp[idx].cancelledAppointments = row.cancelledAppointments;
            dp[idx].earnings = row.earnings;
            dp[idx].uniquePatients = row.uniquePatients;
        }

        // Tabulación: calcular acumulados bottom-up O(12)
        // dp[i].cumulative = dp[i-1].cumulative + dp[i].value
        let cumulativeEarnings = 0;
        let cumulativeAppointments = 0;

        for (const row of dp) {
            cumulativeEarnings += row.earnings;
            cumulativeAppointments += row.totalAppointments;
            row.cumulativeEarnings = cumulativeEarnings;
            row.cumulativeAppointments = cumulativeAppointments;
        }

        const totals: AnnualTotals = {
            totalAppointments: cumulativeAppointments,
            completedAppointments: dp.reduce((s, r) => s + r.completedAppointments, 0),
            cancelledAppointments: dp.reduce((s, r) => s + r.cancelledAppointments, 0),
            totalEarnings: cumulativeEarnings,
        };

        return { success: true, report: dp, totals };
    }

    /**
     * Tendencia de los últimos N meses — útil para gráficas rolling.
     * O(N) donde N es acotado (default 12, máximo 36 recomendado).
     */
    async getMonthlyTrend(docId: string, months = 12): Promise<{
        success: boolean;
        trend: MonthlyTrendPoint[];
    }> {
        const now = new Date();
        const periods = this.buildPeriodRange(now, months);

        // Un solo query con $or para todos los períodos: O(months) = O(k)
        const rows = await this.statsModel
            .find({
                docId,
                $or: periods.map(({ year, month }) => ({ year, month })),
            })
            .lean();

        // Índice para lookup O(1)
        const rowMap = new Map<string, MonthlyStatsDocument>();
        for (const row of rows) {
            rowMap.set(`${row.year}-${row.month}`, row as any);
        }

        const trend: MonthlyTrendPoint[] = periods.map(({ year, month }) => {
            const key = `${year}-${month}`;
            const row = rowMap.get(key);
            return {
                label: `${MONTH_LABELS[month - 1]} ${year}`,
                year,
                month,
                appointments: row?.totalAppointments ?? 0,
                earnings: row?.earnings ?? 0,
                completionRate: row
                    ? row.totalAppointments > 0
                        ? Math.round((row.completedAppointments / row.totalAppointments) * 100)
                        : 0
                    : 0,
            };
        });

        return { success: true, trend };
    }

    /**
     * Upsert atómico con $inc — el corazón del O(1) amortizado.
     * addToSet para uniquePatientIds garantiza cardinalidad correcta
     * sin traer el documento completo a memoria.
     */
    private async incrementStats(
        docId: string,
        year: number,
        month: number,
        delta: {
            totalAppointments?: number;
            completedAppointments?: number;
            cancelledAppointments?: number;
            earnings?: number;
            patientId?: string;
        },
    ): Promise<void> {
        const { patientId, ...numericDeltas } = delta;

        const incOp: Record<string, number> = {};
        for (const [key, val] of Object.entries(numericDeltas)) {
            if (val !== undefined) incOp[key] = val;
        }

        const updateOp: Record<string, any> = {};
        if (Object.keys(incOp).length > 0) updateOp['$inc'] = incOp;

        if (patientId) {
            // $addToSet es idempotente — garantiza unicidad sin duplicados
            updateOp['$addToSet'] = { uniquePatientIds: patientId };
        }

        const updated = await this.statsModel.findOneAndUpdate(
            { docId, year, month },
            updateOp,
            { upsert: true, new: true },
        );

        // Si se añadió un nuevo paciente, recalcular el count.
        // Evitar pasar un array de pipeline a `updateOne` (causa del error).
        // En su lugar, calculamos el tamaño cliente-lado y actualizamos con $set.
        if (patientId) {
            const uniqueCount = Array.isArray(updated?.uniquePatientIds)
                ? updated.uniquePatientIds.length
                : 0;

            if (uniqueCount !== updated?.uniquePatients) {
                await this.statsModel.updateOne(
                    { docId, year, month },
                    { $set: { uniquePatients: uniqueCount } },
                );
            }
        }
    }

    private extractYearMonth(date: Date): { year: number; month: number } {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
        };
    }

    private buildPeriodRange(
        from: Date,
        months: number,
    ): Array<{ year: number; month: number }> {
        const result: Array<{ year: number; month: number }> = [];
        const current = new Date(from.getFullYear(), from.getMonth(), 1);

        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(current);
            d.setMonth(current.getMonth() - i);
            result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }

        return result;
    }
}

export interface AnnualReportRow {
    month: number;
    monthLabel: string;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    earnings: number;
    uniquePatients: number;
    cumulativeEarnings: number;
    cumulativeAppointments: number;
}

export interface AnnualTotals {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalEarnings: number;
}

export interface MonthlyTrendPoint {
    label: string;
    year: number;
    month: number;
    appointments: number;
    earnings: number;
    completionRate: number;
}

const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
