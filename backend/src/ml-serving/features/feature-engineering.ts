import { createHash } from 'node:crypto';
import type { TimeBand } from '../types';

export const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export function timeBand(date: Date): TimeBand {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

export function weekdayOf(date: Date): number {
  return date.getDay();
}

// Días completos entre reserva y slot (pandas `.dt.days` también trunca). Nunca negativo.
export function leadTimeDays(createdAtMs: number, scheduledAt: Date): number {
  if (!Number.isFinite(createdAtMs)) return 0;
  return Math.max(
    0,
    Math.floor((scheduledAt.getTime() - createdAtMs) / DAY_MS),
  );
}

// Pseudónimo estable: el userId crudo nunca se serializa en el dataset.
export function patientKey(rawUserId: string): string {
  return createHash('sha256').update(rawUserId).digest('hex').slice(0, 12);
}

export interface HistoryState {
  count: number;
  cancelled: number;
  noShow: number;
}

export function emptyHistory(): HistoryState {
  return { count: 0, cancelled: 0, noShow: 0 };
}

export function historyFeatures(state: HistoryState): {
  priorCount: number;
  priorCancelRate: number;
  priorNoShowRate: number;
} {
  const denominator = state.count === 0 ? 1 : state.count;
  return {
    priorCount: state.count,
    priorCancelRate: state.cancelled / denominator,
    priorNoShowRate: state.noShow / denominator,
  };
}

// Se llama DESPUÉS de emitir la fila: solo desenlaces ya ocurridos.
export function observe(
  state: HistoryState,
  outcome: { cancelled: boolean; noShow: boolean },
): void {
  state.count += 1;
  if (outcome.cancelled) state.cancelled += 1;
  if (outcome.noShow) state.noShow += 1;
}

export interface LabelInput {
  cancelled: boolean;
  cancelledAt?: number | null;
  isCompleted: boolean;
  scheduledAt: Date;
}

/**
 * label = 1 si canceló con <24h de antelación, o si la cita ya pasó sin
 * completarse. null = no decidible (futura, o cancelada sin timestamp legacy).
 */
export function deriveLabel(input: LabelInput, nowMs: number): 0 | 1 | null {
  if (input.cancelled) {
    if (input.cancelledAt == null) return null;
    const hoursBefore =
      (input.scheduledAt.getTime() - input.cancelledAt) / HOUR_MS;
    return hoursBefore <= 24 ? 1 : 0;
  }
  if (input.isCompleted) return 0;
  return input.scheduledAt.getTime() < nowMs ? 1 : null;
}

const ALLOWED_KEYS = new Set<string>([
  'appointmentId',
  'patientKey',
  'timeBand',
  'weekday',
  'leadTimeDays',
  'priorCount',
  'priorCancelRate',
  'priorNoShowRate',
  'label',
]);

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const PATIENT_KEY = /^[a-f0-9]{12}$/;

// Allowlist de claves + forma estricta de IDs: aborta si se cuela PHI.
export function assertNoPhiFields(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`feature no permitida (posible PHI): ${key}`);
    }
  }
  if (
    typeof row.appointmentId !== 'string' ||
    !OBJECT_ID.test(row.appointmentId)
  ) {
    throw new Error('appointmentId debe ser un ObjectId hex de 24 caracteres');
  }
  if (typeof row.patientKey !== 'string' || !PATIENT_KEY.test(row.patientKey)) {
    throw new Error('patientKey debe ser un hash hex de 12 caracteres');
  }
}

// Ningún string libre: solo enums cortos.
export function assertNoFreeText(row: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== 'string') continue;
    if (value.length > 32 || /\s{2,}|\n/.test(value)) {
      throw new Error(`texto libre detectado en ${key}`);
    }
  }
}
