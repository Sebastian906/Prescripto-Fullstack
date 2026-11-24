import {
  assertNoFreeText,
  assertNoPhiFields,
  emptyHistory,
  historyFeatures,
  leadTimeDays,
  observe,
  outcomeOf,
  patientKey,
  predictionCutoff,
  resolvedAtMs,
  timeBand,
  weekdayOf,
  type HistoryState,
  type ResolvedOutcome,
} from '../features/feature-engineering';
import type { FeatureRow } from '../types';
import { slotDateTime } from '../../shared/utils/slot-generator.util';

export interface RawAppointment {
  _id: unknown;
  userId: string;
  slotDate: string;
  slotTime: string;
  date: number;
  cancelled?: boolean;
  cancelledAt?: number | null;
  isCompleted?: boolean;
  isSynthetic?: boolean;
}

export interface RowOptions {
  now: number;
  includeSynthetic: boolean;
}

/**
 * Transformación pura (sin Mongo) para poder testear el label y el orden.

 * Orden causal por SLOT, no por fecha de reserva: es normal reservar una cita
 * lejana y luego una próxima; el historial solo puede conocer desenlaces de
 * slots ya ocurridos.
 */
export function toFeatureRows(
  docs: RawAppointment[],
  granted: Set<string>,
  options: RowOptions,
): { rows: FeatureRow[]; dropped: number } {
  const ordered = docs
    .map((doc) => ({
      doc,
      scheduledAt: slotDateTime(String(doc.slotDate), String(doc.slotTime)),
    }))
    .filter((item) => !Number.isNaN(item.scheduledAt.getTime()))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const history = new Map<string, HistoryState>();
  const pending: Array<{
    key: string;
    resolvedAt: number;
    outcome: ResolvedOutcome;
  }> = [];
  const rows: FeatureRow[] = [];
  let dropped = docs.length - ordered.length;

  /**
   * Un desenlace solo entra al historial si ya se conocía en el corte de la
   * fila que se va a puntuar. Se encola al emitir su propia fila (nunca se ve a
   * sí misma) y se drena cuando el corte alcanza su `resolvedAt`.
   */
  const drain = (cutoff: number): void => {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const item = pending[index];
      if (item.resolvedAt > cutoff) continue;
      const state = history.get(item.key) ?? emptyHistory();
      observe(state, item.outcome);
      history.set(item.key, state);
      pending.splice(index, 1);
    }
  };

  for (const { doc, scheduledAt } of ordered) {
    if (doc.isSynthetic && !options.includeSynthetic) {
      dropped += 1;
      continue;
    }
    const userId = String(doc.userId);
    if (!granted.has(userId)) {
      dropped += 1;
      continue;
    }

    const input = {
      cancelled: Boolean(doc.cancelled),
      cancelledAt: doc.cancelledAt ?? null,
      isCompleted: Boolean(doc.isCompleted),
      scheduledAt,
    };
    const outcome = outcomeOf(input, options.now);
    if (outcome === null) {
      dropped += 1;
      continue;
    }

    drain(predictionCutoff(scheduledAt));

    const key = patientKey(userId);
    const state = history.get(key) ?? emptyHistory();
    const row: FeatureRow = {
      appointmentId: String(doc._id),
      patientKey: key,
      timeBand: timeBand(scheduledAt),
      weekday: weekdayOf(scheduledAt),
      leadTimeDays: leadTimeDays(doc.date, scheduledAt),
      ...historyFeatures(state),
      label: outcome.label,
    };

    assertNoPhiFields(row as unknown as Record<string, unknown>);
    assertNoFreeText(row as unknown as Record<string, unknown>);
    rows.push(row);
    pending.push({ key, resolvedAt: resolvedAtMs(input), outcome });
  }

  return { rows, dropped };
}
