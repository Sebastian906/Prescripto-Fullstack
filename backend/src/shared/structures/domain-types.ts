/**
 * Tipos de dominio compartidos + asserts runtime.
 * Capa framework-agnostic: NO importar @nestjs/common aquí.
 * La traducción a BadRequestException vive en los services (boundary).
 */

// Código estable para payloads 400.
export type DomainErrorCode =
  | 'INVALID_SLOT_DATE'
  | 'CYCLE_DETECTED'
  | 'ORPHAN_NODE';

// Error tipado de invariante de dominio.
export class DomainInvariantError extends Error {
  readonly code: DomainErrorCode;
  readonly field?: string;
  constructor(code: DomainErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'DomainInvariantError';
    this.code = code;
    if (field !== undefined) this.field = field;
    Object.setPrototypeOf(this, DomainInvariantError.prototype);
  }
}

// Entrada mínima para validación de grafo (acepta nodos parciales).
export interface SpecialityLink {
  id: string;
  parentId: string | null;
}

/**
 * Slot atómico reservable (fecha + hora).
 * Invariantes: date válido según isValidSlotDate; time "hh:mm AM/PM".
 * Coste: comparación O(1) vía toMinutes; orden de día O(s log s), s≈22 constante.
 */
export interface Slot {
  date: string; // DD/MM/YYYY
  time: string; // "10:00 AM"
}

/**
 * Agenda de un día: slots generados vs ocupados.
 * Invariantes: allSlots ordenado cronológico; bookedSlots ⊆ allSlots (por valor).
 * Coste: búsqueda O(log n) con binarySearchSlots; diferencia O(n); sort O(n log n) una vez.
 */
export interface DaySchedule {
  date: string; // DD/MM/YYYY
  allSlots: string[];
  bookedSlots: string[];
}

/**
 * Candidato rankeado por el motor greedy de scheduling.
 * Invariantes: doctorLoad >= 0 entero; gapMinutes >= 0; score finito.
 * Coste: inserción en PriorityQueue O(log n); top-3 O(1) amortizado.
 */
export interface SlotCandidate {
  slotDate: string;
  slotTime: string;
  doctorLoad: number;
  gapMinutes: number;
  score: number;
}

/**
 * Nodo de especialidad en árbol jerárquico.
 * Invariantes: id único; parentId null (raíz) o id existente; grafo acíclico.
 * Coste: build O(n) con Map; findBySlug O(n) DFS; collectDescendants O(n·h).
 */
export interface SpecialityNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: SpecialityNode[];
  metadata?: {
    iconUrl?: string;
    description?: string;
    doctorCount?: number;
  };
}

/**
 * Celda de matriz de estadísticas (filas × columnas, ej. doctor × mes).
 * Invariantes: value número finito >= 0.
 * Coste: acceso O(1) por clave; agregación O(n) sobre celdas.
 */
export interface StatsCell {
  rowId: string;
  colId: string;
  value: number;
}

/**
 * Valida fecha DD/MM/YYYY estricta con round-trip.
 * Estricto: exige 2/2/4 dígitos ("01/01/2026" sí, "1/1/2026" no).
 * Round-trip: construye Date(y,m-1,d) y compara componentes.
 * O(1) tiempo y espacio.
 */
export function isValidSlotDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false;
  const parts = s.split('/');
  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);
  if (!Number.isInteger(dd) || !Number.isInteger(mm) || !Number.isInteger(yyyy))
    return false;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const d = new Date(yyyy, mm - 1, dd);
  return (
    d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yyyy
  );
}

/**
 * Lanza si el grafo parentId contiene ciclos (directos e indirectos).
 * Recorrido iterativo por punteros parent con colores: O(n) tiempo, O(n) espacio.
 * Sin recursión: cada cadena se camina con un bucle y se marca BLACK al terminar.
 */
export function assertAcyclic(nodes: SpecialityLink[]): void {
  const parentById = new Map<string, string | null>();
  for (const n of nodes) parentById.set(n.id, n.parentId);
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const failOnCycle = (id: string): never => {
    throw new DomainInvariantError(
      'CYCLE_DETECTED',
      `Cycle detected at speciality '${id}'`,
      'parentId',
    );
  };
  for (const start of parentById.keys()) {
    if ((color.get(start) ?? WHITE) === BLACK) continue;
    const path: string[] = [];
    let cur: string | null | undefined = start;
    while (cur !== null && cur !== undefined && parentById.has(cur)) {
      const c = color.get(cur) ?? WHITE;
      if (c === BLACK) break;
      if (c === GRAY) failOnCycle(cur);
      color.set(cur, GRAY);
      path.push(cur);
      const parent = parentById.get(cur);
      if (parent === null || parent === undefined || !parentById.has(parent))
        break;
      cur = parent;
    }
    for (const id of path) color.set(id, BLACK);
  }
}

// Versión boolean de assertAcyclic (false = ciclo). O(n).
export function isAcyclic(nodes: SpecialityLink[]): boolean {
  try {
    assertAcyclic(nodes);
    return true;
  } catch (e) {
    if (e instanceof DomainInvariantError && e.code === 'CYCLE_DETECTED')
      return false;
    throw e;
  }
}

/**
 * Lanza si algún parentId no existe en el set de ids.
 * O(n) tiempo, O(n) espacio por el Set.
 */
export function assertNoOrphans(nodes: SpecialityLink[]): void {
  const ids = new Set<string>();
  for (const n of nodes) ids.add(n.id);
  for (const n of nodes) {
    if (n.parentId !== null && !ids.has(n.parentId)) {
      throw new DomainInvariantError(
        'ORPHAN_NODE',
        `Orphan speciality '${n.id}': parent '${n.parentId}' not found`,
        'parentId',
      );
    }
  }
}
