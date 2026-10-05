import { isSlotDate } from '../utils/validators';

/**
 * Tipos de dominio compartidos + asserts runtime.
 * Capa framework-agnostic: NO importar @nestjs/common aquí.
 * La traducción a BadRequestException vive en los services (boundary).
 */

// Código estable para payloads 400.
export type DomainErrorCode =
  | 'INVALID_SLOT_DATE'
  | 'CYCLE_DETECTED'
  | 'ORPHAN_NODE'
  | 'DEPTH_EXCEEDED';

// Profundidad máxima del árbol de especialidades (raíz = 0).
export const MAX_SPECIALITY_DEPTH = 4;

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

// Ciclo en parentId: nombra los nodos en orden (p. ej. a -> b -> a).
export class SpecialityCycleError extends DomainInvariantError {
  readonly nodes: string[];
  constructor(nodes: string[]) {
    super(
      'CYCLE_DETECTED',
      `Cycle detected in speciality hierarchy: ${nodes.join(' -> ')}`,
      'parentId',
    );
    this.name = 'SpecialityCycleError';
    this.nodes = nodes;
    Object.setPrototypeOf(this, SpecialityCycleError.prototype);
  }
}

// Profundidad excedida: ruta desde la raíz hasta el nodo infractor.
export class SpecialityDepthError extends DomainInvariantError {
  readonly nodes: string[];
  readonly depth: number;
  constructor(
    nodes: string[],
    depth: number,
    maxDepth: number = MAX_SPECIALITY_DEPTH,
  ) {
    super(
      'DEPTH_EXCEEDED',
      `Speciality depth ${depth} exceeds max ${maxDepth}: ${nodes.join(' -> ')}`,
      'parentId',
    );
    this.name = 'SpecialityDepthError';
    this.nodes = nodes;
    this.depth = depth;
    Object.setPrototypeOf(this, SpecialityDepthError.prototype);
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
 * Implementación única: shared/utils/validators.isSlotDate (AFD documentado
 * allí). Alias para no duplicar la regla ni romper a los llamadores actuales.
 */
export const isValidSlotDate = isSlotDate;

/**
 * Lanza si el grafo parentId contiene ciclos (directos e indirectos).
 * Recorrido iterativo por punteros parent: O(n) tiempo, O(n) espacio.
 * El error incluye la ruta completa del ciclo (p. ej. a -> b -> a).
 */
export function assertAcyclic(nodes: SpecialityLink[]): void {
  const parentById = new Map<string, string | null>();
  for (const n of nodes) parentById.set(n.id, n.parentId);
  const black = new Set<string>();
  for (const start of parentById.keys()) {
    if (black.has(start)) continue;
    const order: string[] = [];
    const pos = new Map<string, number>();
    let cur: string | null | undefined = start;
    while (cur !== null && cur !== undefined && parentById.has(cur)) {
      if (black.has(cur)) break;
      const at = pos.get(cur);
      if (at !== undefined) {
        throw new SpecialityCycleError([...order.slice(at), cur]);
      }
      pos.set(cur, order.length);
      order.push(cur);
      const parent = parentById.get(cur);
      if (parent === null || parent === undefined || !parentById.has(parent))
        break;
      cur = parent;
    }
    for (const id of order) black.add(id);
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

/**
 * Lanza SpecialityDepthError si algún nodo supera maxDepth (raíz = 0).
 * Profundidad memoizada: cada arista se recorre una vez → O(n) tiempo, O(n) espacio.
 * Los parentId inexistentes se tratan como frontera (el nodo cuenta como raíz
 * de su propio subárbol); los huérfanos los reporta buildSpecialityTree.
 */
export function assertMaxDepth(
  nodes: SpecialityLink[],
  maxDepth: number = MAX_SPECIALITY_DEPTH,
): void {
  const parentById = new Map<string, string | null>();
  for (const n of nodes) parentById.set(n.id, n.parentId);
  const parentOf = (id: string): string | null => parentById.get(id) ?? null;
  const cache = new Map<string, number>();
  const depthOf = (id: string): number => {
    const hit = cache.get(id);
    if (hit !== undefined) return hit;
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur: string | null = id;
    while (cur !== null && parentById.has(cur) && !cache.has(cur)) {
      if (seen.has(cur)) {
        throw new SpecialityCycleError([
          ...chain.slice(chain.indexOf(cur)),
          cur,
        ]);
      }
      seen.add(cur);
      chain.push(cur);
      const p: string | null = parentOf(cur);
      cur = p !== null && parentById.has(p) ? p : null;
    }
    let d = cur === null ? -1 : (cache.get(cur) ?? -1);
    for (let i = chain.length - 1; i >= 0; i--) {
      d += 1;
      cache.set(chain[i], d);
    }
    return cache.get(id) ?? 0;
  };
  const pathOf = (id: string): string[] => {
    const path: string[] = [];
    const seen = new Set<string>();
    let cur: string | null = id;
    while (cur !== null && parentById.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      path.unshift(cur);
      const p: string | null = parentOf(cur);
      cur = p !== null && parentById.has(p) ? p : null;
    }
    return path;
  };
  for (const n of nodes) {
    const d = depthOf(n.id);
    if (d > maxDepth) throw new SpecialityDepthError(pathOf(n.id), d, maxDepth);
  }
}
