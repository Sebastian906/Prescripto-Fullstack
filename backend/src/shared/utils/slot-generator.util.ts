/**
 * Genera todos los slots posibles de un día dado.
 * Retorna arreglo ORDENADO ascendentemente (invariante requerido por binary search).
 * @param date - Día base (solo se usa la fecha).
 * @param startHour - Hora de inicio en 24h (defecto 10).
 * @param endHour - Hora de fin en 24h, exclusiva (defecto 21).
 * @param intervalMinutes - Paso en minutos (defecto 30).
 * @returns Slots ordenados ["10:00 AM", "10:30 AM", ..., "08:30 PM"].
 * @complexity O(s) — s = slots por día (constante ~22 con defaults).
 */
export function generateDaySlots(
  date: Date,
  startHour = 10,
  endHour = 21,
  intervalMinutes = 30,
): string[] {
  const slots: string[] = [];
  const current = new Date(date);
  current.setHours(startHour, 0, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);

  while (current < end) {
    // Formato HH:MM am/pm consistente con el frontend existente
    slots.push(
      current.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    );
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  // Ya viene ordenado por construcción, pero lo explicitamos
  // para mantener el contrato con binarySearch
  return slots; // ["10:00 AM", "10:30 AM", ..., "08:30 PM"]
}

/**
 * Convierte fecha a clave de slot: "15/7/2025"
 * @param date - Fecha a convertir.
 * @returns Clave "día/mes/año" sin zero-pad (ej. "15/7/2025").
 * @complexity O(1).
 */
export function dateToSlotKey(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
