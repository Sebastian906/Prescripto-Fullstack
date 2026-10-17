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

/**
 * Combina `slotDate` ("D/M/YYYY" legacy o "D_M_YYYY" normalizado) con
 * `slotTime` ("hh:mm AM/PM", o 24h si falta el meridiano) en un `Date` local.
 * Inverso de `dateToSlotKey`; lo usa el productor del outbox para `scheduledAt`.
 * Best-effort: si `slotTime` no parsea, devuelve la medianoche de esa fecha.
 * @complexity O(1).
 */
export function slotDateTime(slotDate: string, slotTime: string): Date {
  const [day, month, year] = slotDate.replace(/\//g, '_').split('_').map(Number);

  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(slotTime.trim());
  let hours = 0;
  let minutes = 0;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'AM') hours = hours % 12;
    else if (meridiem === 'PM') hours = (hours % 12) + 12;
  }

  return new Date(year, month - 1, day, hours, minutes);
}
