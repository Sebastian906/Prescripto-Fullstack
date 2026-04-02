export interface SpecialityNode {
    id: string;
    name: string;
    slug: string;          // "general-physician"
    parentId: string | null;
    children: SpecialityNode[];
    metadata?: {
        iconUrl?: string;
        description?: string;
        doctorCount?: number;  // se puebla dinámicamente
    };
}

/**
 * Construye un árbol jerárquico desde una lista plana.
 * Algoritmo: single-pass con Map lookup → O(n) tiempo, O(n) espacio.
 *
 * Recursión implícita: cada nodo es raíz de su propio subárbol.
 * La función buildTree actúa como función de orden superior que
 * delega el ensamblaje a attachChildren (recursivo).
 */
export function buildSpecialityTree(
    flatList: Array<{ id: string; name: string; parentId: string | null; slug: string }>,
): SpecialityNode[] {
    // Paso 1: Construir índice O(n)
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

    // Paso 2: Enlazar hijos — O(n), sin recursión explícita en este paso
    const roots: SpecialityNode[] = [];

    for (const node of nodeMap.values()) {
        if (node.parentId === null) {
            roots.push(node);
        } else {
            const parent = nodeMap.get(node.parentId);
            if (parent) {
                parent.children.push(node);
            }
        }
    }

    return roots;
}

/**
 * Búsqueda recursiva por slug dentro del árbol.
 * Complejidad: O(n) worst-case, O(log n) en árbol balanceado.
 * Usa DFS (pila implícita del call stack).
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
 * Recursión de cola optimizable — O(n) donde n = tamaño de la rama.
 */
export function collectDescendantSlugs(node: SpecialityNode): string[] {
    const slugs: string[] = [node.slug];

    for (const child of node.children) {
        slugs.push(...collectDescendantSlugs(child));
    }

    return slugs;
}