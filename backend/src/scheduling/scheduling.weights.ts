/**
 * Pesos medidos del sugeridor greedy de slots.

 * Fuente dataset: PILOTO n=200, pendiente F-02 (no-show rate por franja).
 * Fecha: 2026-10-05. Estado: PILOTO / PENDIENTE_F-02 — valores heredados
 * de intuición, congelados hasta calibración contra EDA F-02.
 * Golden que los ancla: `src/tests/scheduling.golden.spec.ts` (G01-G30).
 * Doc: `src/scheduling/WEIGHTS.md`.

 * TODO(F-02): recalibrar con no-show rate por franja (mañana/tarde/noche).
 * No introducir nuevas heurísticas (knight/beam) — diferido a C-06.
 */
export const WEIGHT_LOAD = -2; // puntos por cita ocupada ese día
export const WEIGHT_GAP = 1; // puntos por cada bloque de 30min libres (cap 4)
export const WEIGHT_MORNING = 1; // bonus si parseHour(slot) < 13
export const URGENCY_BONUS = {
  urgent: 10,
  normal: 5,
  flexible: 0,
} as const;
export type PriorityLevel = keyof typeof URGENCY_BONUS;
