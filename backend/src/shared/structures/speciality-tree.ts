import {
  MAX_SPECIALITY_DEPTH,
  assertAcyclic,
  assertMaxDepth,
} from './domain-types';

export { MAX_SPECIALITY_DEPTH };

export interface SpecialityNode {
  id: string;
  name: string;
  slug: string; // "general-physician"
  parentId: string | null;
  children: SpecialityNode[];
  metadata?: {
    iconUrl?: string;
    description?: string;
    doctorCount?: number; // se puebla dinámicamente
  };
}

// Fila plana aceptada por el builder (documento DB normalizado o fixture).
export interface SpecialityFlatNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

// Huérfano: parentId apunta a un id ausente. Se reporta, nunca se pierde.
export type SpecialityOrphanNode = SpecialityFlatNode;

// Resultado del builder: raíces enlazadas + huérfanos planos + conteo.
export interface SpecialityTreeResult {
  roots: SpecialityNode[];
  orphans: SpecialityOrphanNode[];
  orphanCount: number;
  maxDepth: number;
}

/**
 * Construye un árbol jerárquico desde una lista plana.
 * Algoritmo: validación O(n) + indexado O(n) + enlazado O(n) con Map lookup.
 *
 * - Ciclos (a→b→a): lanza SpecialityCycleError nombrando los nodos en orden.
 * - Huérfanos: NO se descartan; se devuelven en `orphans`.
 * - Profundidad > MAX_SPECIALITY_DEPTH (4): lanza SpecialityDepthError con la ruta.
 *
 * @param flatList - Nodos planos con id, name, slug y parentId.
 * @returns Raíces con children enlazados + huérfanos reportados.
 * @complexity O(n) tiempo, O(n) espacio. Sin recursión en el enlazado.
 */
export function buildSpecialityTree(
  flatList: SpecialityFlatNode[],
): SpecialityTreeResult {
  // Frontera de invariantes (falla rápido con error tipado).
  assertAcyclic(flatList);
  assertMaxDepth(flatList, MAX_SPECIALITY_DEPTH);

  // Paso 1: construir índice O(n).
  const nodeMap = new Map<string, SpecialityNode>();
  for (const item of flatList) {
    nodeMap.set(item.id, {
      id: item.id,
      name: item.name,
      slug: item.slug,
      parentId: item.parentId,
      children: [],
    });
  }

  // Paso 2: enlazar hijos O(n); el huérfano se reporta en vez de perderse.
  const roots: SpecialityNode[] = [];
  const orphans: SpecialityOrphanNode[] = [];
  for (const item of flatList) {
    const node = nodeMap.get(item.id);
    if (!node) continue;
    if (item.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        orphans.push({
          id: item.id,
          name: item.name,
          slug: item.slug,
          parentId: item.parentId,
        });
      }
    }
  }

  return {
    roots,
    orphans,
    orphanCount: orphans.length,
    maxDepth: MAX_SPECIALITY_DEPTH,
  };
}

/**
 * Búsqueda recursiva por slug dentro del árbol.
 * Usa DFS (pila implícita del call stack); profundidad acotada a 4.
 * @param nodes - Raíces donde iniciar la búsqueda.
 * @param slug - Slug exacto a localizar (case-sensitive).
 * @returns El nodo si existe; null si no se encuentra.
 * @complexity O(n) worst-case.
 */
export function findNodeBySlug(
  nodes: SpecialityNode[],
  slug: string,
): SpecialityNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;

    if (node.children.length > 0) {
      const found = findNodeBySlug(node.children, slug);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recolecta TODOS los slugs de una rama (nodo + descendientes).
 * Usado para filtrar doctores: si seleccionas "Surgeon",
 * incluye "Orthopedic Surgeon", "Neurosurgeon", etc.
 * @param node - Raíz de la rama a recolectar.
 * @returns Slugs de la rama (nodo primero, luego descendientes en DFS).
 * @complexity O(n·h) — n = tamaño de la rama, h = altura (h ≤ 4 por invariante).
 */
export function collectDescendantSlugs(node: SpecialityNode): string[] {
  const slugs: string[] = [node.slug];

  for (const child of node.children) {
    slugs.push(...collectDescendantSlugs(child));
  }

  return slugs;
}
