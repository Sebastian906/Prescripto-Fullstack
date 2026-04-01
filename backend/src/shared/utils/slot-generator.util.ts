/**
 * Genera todos los slots posibles de un día dado.
 * Retorna arreglo ORDENADO ascendentemente (invariante requerido por binary search).
 * O(s) donde s = número de slots por día (constante ~22 slots para 10:00-21:00 c/30min)
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
 */
export function dateToSlotKey(date: Date): string {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}