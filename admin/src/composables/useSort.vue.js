import { ref, computed } from 'vue'

/**
 * Los cuatro criterios de ordenamiento.

 * 'speciality-group' difiere del filtro de botones existente en el admin:
 *   - El filtro OCULTA doctores de otras especialidades.
 *   - 'speciality-group' MUESTRA todos los doctores pero los agrupa
 *     por especialidad consecutivamente.
 */
export const SORT_OPTIONS = [
    { value: 'none', label: 'Default' },
    { value: 'name-asc', label: 'Name (A → Z)' },
    { value: 'name-desc', label: 'Name (Z → A)' },
    { value: 'fees-asc', label: 'Price (low → high)' },
    { value: 'fees-desc', label: 'Price (high → low)' },
    { value: 'speciality-group-asc', label: 'Speciality (A → Z, grouped)' },
    { value: 'speciality-group-desc', label: 'Speciality (Z → A, grouped)' },
]

/**
 * Extrae el valor de comparación de un doctor según la clave.
 * Normaliza null/undefined a '' o 0.
 *
 * @param {object} doctor
 * @param {string} key
 * @returns {string|number}
 */
function getValue(doctor, key) {
    switch (key) {
        case 'name':
            return (doctor.name ?? '').toLowerCase()
        case 'fees':
            return typeof doctor.fees === 'number' ? doctor.fees : 0
        case 'speciality':
        case 'speciality-group':
            return (doctor.speciality ?? '').toLowerCase()
        default:
            return ''
    }
}

// Comparador genérico. Retorna negativo, 0 o positivo.
function compare(a, b, key, order) {
    const va = getValue(a, key)
    const vb = getValue(b, key)

    let result
    if (typeof va === 'number' && typeof vb === 'number') {
        result = va - vb
    } else {
        result = String(va).localeCompare(String(vb))
    }

    return order === 'asc' ? result : -result
}

// Paso de fusión — O(n). El <= preserva la estabilidad.
function merge(left, right, key, order) {
    const result = []
    let i = 0
    let j = 0

    while (i < left.length && j < right.length) {
        if (compare(left[i], right[j], key, order) <= 0) {
            result.push(left[i++])
        } else {
            result.push(right[j++])
        }
    }

    while (i < left.length) result.push(left[i++])
    while (j < right.length) result.push(right[j++])

    return result
}

/**
 * Merge Sort recursivo — O(n log n), estable.
 * No muta el arreglo original.

 * @param {Array}  array
 * @param {string} key
 * @param {'asc'|'desc'} order
 * @returns {Array}
 */
function mergeSort(array, key, order) {
    if (array.length <= 1) return array

    const mid = Math.floor(array.length / 2)
    const left = mergeSort(array.slice(0, mid), key, order)
    const right = mergeSort(array.slice(mid), key, order)

    return merge(left, right, key, order)
}

/**
 * Ordenamiento especial por grupo de especialidad.

 * Ordena las especialidades únicas (A→Z o Z→A) y concatena los
 * doctores de cada grupo preservando su orden relativo.
 * TODOS los doctores permanecen visibles — ninguno se filtra.

 * @param {Array}        doctors
 * @param {'asc'|'desc'} order
 * @returns {Array}
 */
function sortBySpecialityGroup(doctors, order) {
    if (doctors.length <= 1) return doctors

    const unique = [...new Set(doctors.map((d) => (d.speciality ?? '').toLowerCase()))]

    const sortedSpecs = mergeSort(
        unique.map((s) => ({ speciality: s })),
        'speciality',
        order,
    ).map((item) => item.speciality)

    const groups = new Map()
    for (const spec of sortedSpecs) {
        groups.set(spec, [])
    }
    for (const doctor of doctors) {
        const key = (doctor.speciality ?? '').toLowerCase()
        groups.get(key)?.push(doctor)
    }

    return sortedSpecs.flatMap((spec) => groups.get(spec) ?? [])
}
/**
 * useSort — aplica Merge Sort sobre una lista reactiva de doctores.
 *
 * Diseñado para integrarse con el filtro de especialidad existente:
 * recibe `filteredDoctors` (ya filtrada o completa) como Ref o valor plano,
 * y devuelve `sortedDoctors` como propiedad computada que Vue cachea
 * automáticamente.
 *
 * @param {import('vue').Ref<Array>|Array} filteredDoctors  Lista de doctores.
 * @returns {{ sortedDoctors, sortOption, SORT_OPTIONS }}
 *
 */
export function useSort(filteredDoctors) {
    // Opción actualmente seleccionada en la UI
    const sortOption = ref('none')

    /**
     * Lista de doctores ordenada.
     * Vue recalcula este computed solo cuando cambian
     * `filteredDoctors` o `sortOption` — O(n log n) amortizado.
     */
    const sortedDoctors = computed(() => {
        const list = Array.isArray(filteredDoctors)
            ? filteredDoctors
            : filteredDoctors.value ?? []

        if (!list.length || sortOption.value === 'none') return list

        const lastDash = sortOption.value.lastIndexOf('-')
        const key = sortOption.value.slice(0, lastDash)
        const order = sortOption.value.slice(lastDash + 1)

        if (key === 'speciality-group') {
            return sortBySpecialityGroup(list, order)
        }

        return mergeSort(list, key, order)
    })

    return { sortedDoctors, sortOption, SORT_OPTIONS }
}