/**
 * Busca un valor en un arreglo ordenado ascendentemente.
 * Retorna el índice si existe, -1 si no.
 * O(log n) tiempo, O(1) espacio.
 */
export function binarySearch(sortedArr: string[], target: string): number {
    let low = 0;
    let high = sortedArr.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const comparison = sortedArr[mid].localeCompare(target);

        if (comparison === 0) return mid;
        if (comparison < 0) low = mid + 1;
        else high = mid - 1;
    }

    return -1;
}

/**
 * Retorna el índice del primer elemento >= target.
 * Útil para encontrar el primer slot disponible en una franja horaria.
 * Ej: buscar primer slot >= "14:00" para citas de tarde.
 * O(log n) tiempo, O(1) espacio.
 */
export function lowerBound(sortedArr: string[], target: string): number {
    let low = 0;
    let high = sortedArr.length;

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (sortedArr[mid].localeCompare(target) < 0) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return low; // sortedArr.length si todos son < target
}

/**
 * Dado un arreglo de slots posibles y un arreglo de slots ocupados (ambos ordenados),
 * retorna los slots disponibles usando merge-scan O(n+m) en lugar de O(n*m).
 */
export function getAvailableSlots(
    allSlots: string[],
    bookedSlots: string[],
): string[] {
    const available: string[] = [];
    let bookedIdx = 0;

    for (const slot of allSlots) {
        while (
            bookedIdx < bookedSlots.length &&
            bookedSlots[bookedIdx].localeCompare(slot) < 0
        ) {
            bookedIdx++;
        }

        const isBooked =
            bookedIdx < bookedSlots.length &&
            bookedSlots[bookedIdx] === slot;

        if (!isBooked) available.push(slot);
    }

    return available;
}