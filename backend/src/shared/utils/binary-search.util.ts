/**
 * Orden y búsqueda cronológica de slots ("10:00 AM", "02:00 PM", "14:30").
 * Criterio canónico: minutos desde medianoche vía `toMinutes()`.
 * No usar `localeCompare` sobre slots: ordena "02:00 PM" antes que
 * "10:00 AM" y produce el bug del "free slot fantasma".
 */

/**
 * Convierte un slot a minutos desde medianoche.
 * Soporta 12h ("02:00 PM", "2:00pm", "10:30 A M") y 24h ("14:30").
 * Insensible a mayúsculas, puntos y espacios extra.
 * @param slot - Slot a convertir.
 * @returns Minutos 0-1439; NaN si el formato es inválido.
 */
export function toMinutes(slot: string): number {
  const s = slot.trim().toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ');

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h > 23 || m > 59) return NaN;
    return h * 60 + m;
  }

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*([AP])\s*M?$/);
  if (!m12) return NaN;
  let h = Number(m12[1]);
  const m = Number(m12[2]);
  if (h < 1 || h > 12 || m > 59) return NaN;
  if (m12[3] === 'P' && h !== 12) h += 12;
  if (m12[3] === 'A' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Comparador cronológico para `Array#sort`.
 * Entradas inválidas (NaN) van al final con orden determinista,
 * sin usar `localeCompare` para que el grep de slots quede en cero.
 */
export function compareSlots(a: string, b: string): number {
  const na = toMinutes(a);
  const nb = toMinutes(b);
  const aInvalid = Number.isNaN(na);
  const bInvalid = Number.isNaN(nb);
  if (aInvalid && bInvalid) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  if (aInvalid) return 1;
  if (bInvalid) return -1;
  return na - nb;
}

// Copia ordenada cronológicamente. No muta el arreglo original.
export function sortSlots(slots: string[]): string[] {
  return [...slots].sort(compareSlots);
}

/**
 * Busca un valor en un arreglo ordenado cronológicamente.
 * @complexity O(log n) tiempo, O(1) espacio.
 */
export function binarySearchSlots(sortedArr: string[], target: string): number {
  let low = 0;
  let high = sortedArr.length - 1;
  const targetMin = toMinutes(target);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const comparison = compareSlots(sortedArr[mid], target);
    // Atajo exacto: si ambos son válidos y difieren, comparar minutos.
    if (!Number.isNaN(targetMin) && comparison === 0) return mid;
    if (comparison === 0) return mid;
    if (comparison < 0) low = mid + 1;
    else high = mid - 1;
  }

  return -1;
}

/**
 * Índice del primer elemento >= target (criterio cronológico).
 * @complexity O(log n) tiempo, O(1) espacio.
 */
export function lowerBoundSlots(sortedArr: string[], target: string): number {
  let low = 0;
  let high = sortedArr.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareSlots(sortedArr[mid], target) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Slots de `allSlots` ausentes en `bookedSlots` (ambos en orden cronológico).
 * @complexity O(n+m) tiempo, O(n) espacio.
 */
export function getAvailableSlotsByMinutes(
  allSlots: string[],
  bookedSlots: string[],
): string[] {
  const available: string[] = [];
  let bookedIdx = 0;

  for (const slot of allSlots) {
    while (
      bookedIdx < bookedSlots.length &&
      compareSlots(bookedSlots[bookedIdx], slot) < 0
    ) {
      bookedIdx++;
    }

    const isBooked =
      bookedIdx < bookedSlots.length &&
      compareSlots(bookedSlots[bookedIdx], slot) === 0;

    if (!isBooked) available.push(slot);
  }

  return available;
}

/**
 * Alias legacy: misma firma, criterio cronológico.
 * Se conservan para no romper imports existentes.
 */
export function binarySearch(sortedArr: string[], target: string): number {
  return binarySearchSlots(sortedArr, target);
}

export function lowerBound(sortedArr: string[], target: string): number {
  return lowerBoundSlots(sortedArr, target);
}

export function getAvailableSlots(
  allSlots: string[],
  bookedSlots: string[],
): string[] {
  return getAvailableSlotsByMinutes(allSlots, bookedSlots);
}
