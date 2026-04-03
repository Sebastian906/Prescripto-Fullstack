/**
 * Merge Sort — O(n log n) estable.
 *
 * Adaptado para ordenar arreglos de objetos por una propiedad dinámica.
 * Es una función pura: no muta el arreglo original.
 *
 * Criterio especial 'speciality-group':
 *   Ordena todos los doctores agrupándolos por especialidad (alfabético),
 *   y dentro de cada grupo mantiene el orden de inserción (estabilidad).
 *   Esto difiere del filtro de especialidad del frontend, que OCULTA
 *   doctores de otras especialidades — aquí TODOS permanecen visibles.
 */

export type SortOrder = 'asc' | 'desc';

export type SortKey = 'name' | 'fees' | 'speciality' | 'speciality-group';

// Subconjunto de propiedades que usa el algoritmo de ordenamiento
export interface SortableDoctor {
    name?: string | null;
    fees?: number | null;
    speciality?: string | null;
    [key: string]: unknown;
}

/**
 * Extrae el valor de comparación del doctor según la clave solicitada.
 * Devuelve un string en lowercase para comparaciones léxicas consistentes,
 * o un número para fees.  Valores nulos/undefined se normalizan a '' / 0
 * para evitar NaN o errores de comparación.
 */
function getValue(doctor: SortableDoctor, key: SortKey): string | number {
    switch (key) {
        case 'name':
            return (doctor.name ?? '').toLowerCase();

        case 'fees':
            return typeof doctor.fees === 'number' ? doctor.fees : 0;

        case 'speciality':
        case 'speciality-group':
            return (doctor.speciality ?? '').toLowerCase();
    }
}

// Comparador genérico.  Retorna < 0, 0 o > 0 igual que Array#sort.
function compare(
    a: SortableDoctor,
    b: SortableDoctor,
    key: SortKey,
    order: SortOrder,
): number {
    const va = getValue(a, key);
    const vb = getValue(b, key);

    let result: number;

    if (typeof va === 'number' && typeof vb === 'number') {
        result = va - vb;
    } else {
        result = String(va).localeCompare(String(vb));
    }

    return order === 'asc' ? result : -result;
}

// Paso de fusión (merge).  Combina dos mitades ya ordenadas en un único
// arreglo ordenado.  O(n) tiempo y espacio auxiliar por nivel.
function merge<T extends SortableDoctor>(
    left: T[],
    right: T[],
    key: SortKey,
    order: SortOrder,
): T[] {
    const result: T[] = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
        if (compare(left[i], right[j], key, order) <= 0) {
            result.push(left[i++]);
        } else {
            result.push(right[j++]);
        }
    }

    while (i < left.length) result.push(left[i++]);
    while (j < right.length) result.push(right[j++]);

    return result;
}

/**
 * Merge Sort recursivo — función principal.
 *
 * @param array  Arreglo de doctores (no se muta).
 * @param key    Propiedad por la que ordenar.
 * @param order  'asc' | 'desc'
 * @returns      Nuevo arreglo ordenado.
 */
export function mergeSort<T extends SortableDoctor>(
    array: T[],
    key: SortKey,
    order: SortOrder,
): T[] {
    if (array.length <= 1) return array;

    const mid = Math.floor(array.length / 2);

    const left = mergeSort(array.slice(0, mid), key, order);
    const right = mergeSort(array.slice(mid), key, order);

    return merge(left, right, key, order);
}

/**
 * Ordena todos los doctores agrupándolos por especialidad.
 *
 * Algoritmo:
 * 1. Extrae las especialidades únicas y las ordena (Merge Sort, O(e log e)).
 * 2. Para cada especialidad (en orden), extrae los doctores que pertenecen
 *    a ella (preservando su orden relativo — estabilidad del merge sort).
 * 3. Concatena los grupos → resultado final O(n log n + e log e).
 *
 * Diferencia clave respecto al filtro del frontend:
 *   - El filtro OCULTA doctores de otras especialidades.
 *   - Este ordenamiento MUESTRA todos los doctores, pero separados
 *     visualmente por grupos de especialidad consecutivos.
 *
 * @param doctors  Lista completa de doctores.
 * @param order    'asc' ordena especialidades A→Z; 'desc' Z→A.
 */
export function sortBySpecialityGroup<T extends SortableDoctor>(
    doctors: T[],
    order: SortOrder,
): T[] {
    if (doctors.length <= 1) return doctors;

    const uniqueSpecialities = [
        ...new Set(doctors.map((d) => (d.speciality ?? '').toLowerCase())),
    ];

    const sortedSpecialities = mergeSort(
        uniqueSpecialities.map((s) => ({ speciality: s })),
        'speciality',
        order,
    ).map((item) => item.speciality as string);

    const groups = new Map<string, T[]>();
    for (const spec of sortedSpecialities) {
        groups.set(spec, []);
    }

    for (const doctor of doctors) {
        const key = (doctor.speciality ?? '').toLowerCase();
        groups.get(key)?.push(doctor);
    }

    const result: T[] = [];
    for (const spec of sortedSpecialities) {
        result.push(...(groups.get(spec) ?? []));
    }

    return result;
}