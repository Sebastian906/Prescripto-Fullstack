import {
  assertNoFreeText,
  assertNoPhiFields,
  deriveLabel,
  emptyHistory,
  historyFeatures,
  leadTimeDays,
  observe,
  patientKey,
  timeBand,
  weekdayOf,
  type HistoryState,
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
  const rows: FeatureRow[] = [];
  let dropped = docs.length - ordered.length;

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

    const label = deriveLabel(
      {
        cancelled: Boolean(doc.cancelled),
        cancelledAt: doc.cancelledAt ?? null,
        isCompleted: Boolean(doc.isCompleted),
        scheduledAt,
      },
      options.now,
    );
    if (label === null) {
      dropped += 1;
      continue;
    }

    const key = patientKey(userId);
    const state = history.get(key) ?? emptyHistory();
    const row: FeatureRow = {
      appointmentId: String(doc._id),
      patientKey: key,
      timeBand: timeBand(scheduledAt),
      weekday: weekdayOf(scheduledAt),
      leadTimeDays: leadTimeDays(doc.date, scheduledAt),
      ...historyFeatures(state),
      label,
    };

    assertNoPhiFields(row as unknown as Record<string, unknown>);
    assertNoFreeText(row as unknown as Record<string, unknown>);
    rows.push(row);

    observe(state, {
      cancelled: Boolean(doc.cancelled),
      noShow: label === 1 && !doc.cancelled,
    });
    history.set(key, state);
  }

  return { rows, dropped };
}
