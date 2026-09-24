import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  MAX_INLINE_PATIENT_IDS,
  MonthlyStats,
  MonthlyStatsDocument,
} from './schemas/monthly-stats.schema';
import {
  MonthlyStatsPatient,
  MonthlyStatsPatientDocument,
} from './schemas/monthly-stats-patient.schema';
import { Model } from 'mongoose';

// Constante para métricas globales del sistema
export const GLOBAL_DOC_ID = '__global__';

/**
 * DP Tabulación — contrato de mutación.
 * Cualquier servicio que altere el estado de una cita llama a estos métodos.
 * La tabla dp[docId][year][month] se actualiza con $inc atómico en MongoDB,
 * lo que garantiza correctitud incluso bajo concurrencia (no necesita lock).
 * Higiene: uniquePatientIds capa en 5000 inline; excedente en
 * MonthlyStatsPatient. uniquePatients se mantiene con $inc +1 solo ante
 * paciente nuevo (filtro $ne / catch E11000), sin traer arrays completos.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(MonthlyStats.name)
    private readonly statsModel: Model<MonthlyStatsDocument>,
    @InjectModel(MonthlyStatsPatient.name)
    private readonly spillModel: Model<MonthlyStatsPatientDocument>,
  ) {}

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
  async onAppointmentCancelled(docId: string, date: Date): Promise<void> {
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

   * Programación Dinámica — Tabulación bottom-up:
   * 1. Recupera los 12 subproblemas ya resueltos: O(12) = O(1)
   * 2. Construye la tabla de acumulados mes a mes: O(12) = O(1)
   * 3. El resultado es un array de 12 filas con running totals

   * Sin DP: habría que hacer find() sobre todas las citas del año → O(n)
   */
  async getAnnualReport(
    docId: string,
    year: number,
  ): Promise<{
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
      completedAppointments: dp.reduce(
        (s, r) => s + r.completedAppointments,
        0,
      ),
      cancelledAppointments: dp.reduce(
        (s, r) => s + r.cancelledAppointments,
        0,
      ),
      totalEarnings: cumulativeEarnings,
    };

    return { success: true, report: dp, totals };
  }

  /**
   * Tendencia de los últimos N meses — útil para gráficas rolling.
   * O(N) donde N es acotado (default 12, máximo 36 recomendado).
   */
  async getMonthlyTrend(
    docId: string,
    months = 12,
  ): Promise<{
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
      rowMap.set(`${row.year}-${row.month}`, row);
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
            ? Math.round(
                (row.completedAppointments / row.totalAppointments) * 100,
              )
            : 0
          : 0,
      };
    });

    return { success: true, trend };
  }

  // Conteo de pacientes en spill para un (docId, year, month).
  async countSpillPatients(
    docId: string,
    year: number,
    month: number,
  ): Promise<number> {
    return this.spillModel.countDocuments({ docId, year, month }).exec();
  }

  /**
   * Lista paginada de patientIds (inline primero, luego spill).
   * Solo trae la ventana pedida: $slice sobre el array inline y
   * skip/limit con sort estable sobre el spill. El offset de spill se
   * calcula desde el conteo inline real (no desde uniquePatients).
   */
  async getUniquePatientIds(
    docId: string,
    year: number,
    month: number,
    page = 1,
    pageSize = 500,
  ): Promise<{ ids: string[]; total: number }> {
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(1000, Math.max(1, Math.floor(pageSize)));
    const header = await this.statsModel.aggregate<{
      inlineCount: number;
      uniquePatients?: number;
    }>([
      { $match: { docId, year, month } },
      {
        $project: {
          _id: 0,
          inlineCount: { $size: { $ifNull: ['$uniquePatientIds', []] } },
          uniquePatients: 1,
        },
      },
    ]);
    const inlineCount = header[0]?.inlineCount ?? 0;
    const spillTotal = await this.spillModel
      .countDocuments({ docId, year, month })
      .exec();
    const total =
      typeof header[0]?.uniquePatients === 'number'
        ? header[0].uniquePatients
        : inlineCount + spillTotal;

    const start = (safePage - 1) * safeSize;
    const end = start + safeSize;
    let ids: string[] = [];

    if (start < inlineCount) {
      const doc = await this.statsModel
        .findOne({ docId, year, month })
        .select('uniquePatientIds')
        .slice('uniquePatientIds', [
          start,
          Math.min(safeSize, inlineCount - start),
        ])
        .lean();
      ids = doc?.uniquePatientIds ?? [];
    }

    const spillNeeded = end - Math.max(start, inlineCount);
    if (spillNeeded > 0) {
      const spillDocs = await this.spillModel
        .find({ docId, year, month })
        .sort({ _id: 1 })
        .skip(Math.max(0, start - inlineCount))
        .limit(spillNeeded)
        .select('patientId')
        .lean();
      ids = [...ids, ...spillDocs.map((s) => s.patientId)];
    }

    return { ids, total };
  }

  /**
   * Upsert atómico con $inc + cap de uniquePatientIds en 5000.
   * - Sin patientId: un solo upsert $inc (path complete/cancel).
   * - Con patientId nuevo e inline con hueco: updateOne con filtro
   *   $ne + $addToSet + $inc uniquePatients:1 (atómico por documento).
   * - Con inline lleno: insert en spill (índice único) + $inc uniquePatients:1;
   *   duplicado concurrente (E11000) → solo $inc de contadores.
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

    const incCounters: Record<string, number> = {};
    for (const [key, val] of Object.entries(numericDeltas)) {
      if (val !== undefined) incCounters[key] = val;
    }

    // Path sin paciente: contadores puros, un solo upsert.
    if (!patientId) {
      const updateOp: Record<string, unknown> = {};
      if (Object.keys(incCounters).length > 0) updateOp['$inc'] = incCounters;
      if (Object.keys(updateOp).length === 0) return;
      await this.statsModel.updateOne({ docId, year, month }, updateOp, {
        upsert: true,
      });
      return;
    }

    // Path con paciente: leer cabecera acotada (sin traer 5000 IDs salvo el doc).
    const existing = await this.statsModel
      .findOne({ docId, year, month })
      .select('uniquePatientIds')
      .lean();

    // Documento inexistente: crearlo con el primer paciente inline.
    // El filtro $ne evita doble conteo si el doc apareció entre el find y
    // el upsert; el 11000 cubre la carrera de inserción concurrente.
    // Sin $setOnInsert: los campos del filtro de igualdad se crean solos y
    // los contadores nacen del $inc (ponerlos en ambos operadores conflicta).
    if (!existing) {
      try {
        await this.statsModel.updateOne(
          { docId, year, month, uniquePatientIds: { $ne: patientId } },
          {
            $inc: { ...incCounters, uniquePatients: 1 },
            $addToSet: { uniquePatientIds: patientId },
          },
          { upsert: true },
        );
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
        if (Object.keys(incCounters).length > 0) {
          await this.statsModel.updateOne(
            { docId, year, month },
            { $inc: incCounters },
          );
        }
      }
      return;
    }

    const inline: string[] = Array.isArray(existing.uniquePatientIds)
      ? existing.uniquePatientIds
      : [];

    // Ya inline → solo contadores.
    if (inline.includes(patientId)) {
      if (Object.keys(incCounters).length === 0) return;
      await this.statsModel.updateOne(
        { docId, year, month },
        { $inc: incCounters },
      );
      return;
    }

    // ¿Ya en spill? → solo contadores.
    const inSpill = await this.spillModel
      .exists({ docId, year, month, patientId })
      .exec();
    if (inSpill) {
      if (Object.keys(incCounters).length === 0) return;
      await this.statsModel.updateOne(
        { docId, year, month },
        { $inc: incCounters },
      );
      return;
    }

    // Hueco inline → intento atómico: el filtro exige a la vez ausencia del
    // paciente y array por debajo del cap (índice 4999 inexistente), en una
    // sola operación. Si falla, se re-verifica antes de ir al spill.
    if (inline.length < MAX_INLINE_PATIENT_IDS) {
      const res = await this.statsModel.updateOne(
        {
          docId,
          year,
          month,
          uniquePatientIds: { $ne: patientId },
          [`uniquePatientIds.${MAX_INLINE_PATIENT_IDS - 1}`]: {
            $exists: false,
          },
        },
        {
          ...(Object.keys(incCounters).length > 0
            ? { $inc: { ...incCounters, uniquePatients: 1 } }
            : { $inc: { uniquePatients: 1 } }),
          $addToSet: { uniquePatientIds: patientId },
        },
      );
      if ((res.modifiedCount ?? 0) > 0) return;
      // Sin modificación: re-check de membresía inline.
      const recheck = await this.statsModel
        .findOne({ docId, year, month })
        .select('uniquePatientIds')
        .lean();
      const reInline: string[] = Array.isArray(recheck?.uniquePatientIds)
        ? recheck.uniquePatientIds
        : [];
      if (reInline.includes(patientId)) {
        if (Object.keys(incCounters).length > 0) {
          await this.statsModel.updateOne(
            { docId, year, month },
            { $inc: incCounters },
          );
        }
        return;
      }
      // Si no está inline (lleno o carrera): continuar al spill, sin return.
    }

    // Inline lleno → spill.
    try {
      await this.spillModel.create({ docId, year, month, patientId });
      // Dedup de carrera: si el paciente también quedó inline mientras
      // tanto, eliminar el spill y no incrementar uniquePatients.
      const raced = await this.statsModel
        .findOne({ docId, year, month })
        .select('uniquePatientIds')
        .lean();
      const racedInline: string[] = Array.isArray(raced?.uniquePatientIds)
        ? raced.uniquePatientIds
        : [];
      if (racedInline.includes(patientId)) {
        await this.spillModel
          .deleteOne({ docId, year, month, patientId })
          .exec();
        if (Object.keys(incCounters).length > 0) {
          await this.statsModel.updateOne(
            { docId, year, month },
            { $inc: incCounters },
          );
        }
        return;
      }
      await this.statsModel.updateOne(
        { docId, year, month },
        {
          ...(Object.keys(incCounters).length > 0
            ? { $inc: { ...incCounters, uniquePatients: 1 } }
            : { $inc: { uniquePatients: 1 } }),
        },
      );
    } catch (err) {
      // Duplicado concurrente en spill (E11000): no contar dos veces.
      const msg = err instanceof Error ? err.message : String(err);
      const isDup =
        (err as { code?: number }).code === 11000 || /duplicate/i.test(msg);
      if (!isDup) throw err;
      if (Object.keys(incCounters).length > 0) {
        await this.statsModel.updateOne(
          { docId, year, month },
          { $inc: incCounters },
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
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
