import { isEmail as isEmailFormat } from 'class-validator';

/**
 * Helpers de validación compartidos — fuente única de reglas de entrada.

 * Contrato de uso:
 * - Los DTOs consumen los `*_PATTERN` con `@Matches(...)` (class-validator no
 *   acepta funciones sueltas como constraint).
 * - Los services y el dominio consumen las predicates (`isSlotDate`, ...).
 * - Sin dependencias nuevas: `isEmail` delega en class-validator.
 *

 * AFD de DD/MM/YYYY (documenta el round-trip de isSlotDate)

 * Estados y transiciones (forma léxica, 10 caracteres):

 *   q0    inicio                     q0  --[0-3]--> q1
 *   q1    1.er dígito del día        q1  --[0]-->   q2a
 *                                    q1  --[1-2]--> q2b
 *                                    q1  --[3]-->   q2c
 *   q2a   día 0X (X: 1-9)           q2a --[1-9]--> q3
 *   q2b   día 1X/2X (X: 0-9)         q2b --[0-9]--> q3
 *   q2c   día 3X (X: 0-1)            q2c --[0-1]--> q3
 *   q3    separador día/mes          q3  --[/]-->   q4
 *   q4    1.er dígito del mes        q4  --[0]-->   q5a
 *                                    q4  --[1]-->   q5b
 *   q5a   mes 0X (X: 1-9)           q5a --[1-9]--> q6
 *   q5b   mes 1X (X: 0-2)           q5b --[0-2]--> q6
 *   q6    separador mes/año          q6  --[/]-->   q7
 *   q7..q10 año (4 dígitos)         q7  --[0-9]--> q8 --[0-9]--> q9
 *                                    q9  --[0-9]--> q10 --[0-9]--> qF
 *   qF    aceptación léxica (estado final, sin transiciones)

 * Aceptación en dos niveles:
 * 1. Léxico: la cadena recorre q0..qF consumiendo exactamente 10 caracteres
 *    (día 01..31, mes 01..12, año de 4 dígitos).
 * 2. Semántico (round-trip): Date.UTC(y, m-1, d) debe devolver exactamente
 *    los componentes leídos (UTC: sin DST ni dependencia de la zona
 *    horaria del servidor); eso impone los días reales de cada mes y la regla
 *    gregoriana de bisiesto ((y%4==0 && y%100!=0) || y%400==0). Un autómata
 *    finito con estados para los 10000 años posibles sería enorme, así que la
 *    implementación factoriza el AFD en: regex (forma) + guardas de rango
 *    (transiciones restringidas de q1/q4) + round-trip (condición final).
 *    Ambas descripciones aceptan exactamente el mismo lenguaje.

 * Año 0000-0099: rechazado en ambos stacks — en JS Date.UTC(y,...) con y<100
 * se interpreta como 1900+y y el round-trip nunca cuadra; Go replica la guarda
 * para mantener la paridad (chat/internal/bot/validators.go).

 * Acepta:   01/01/2026, 29/02/2024, 29/02/2000, 01/01/0100
 * Rechaza:  32/13/2026, 29/02/2025, 31/04/2026, 00/01/2026, 01/00/2026,
 *           1/1/26, 15/7/2025, 2026-01-01, 01/01/0099
 */

// DD/MM/YYYY estricto (2/2/4 dígitos). Backing de isSlotDate.
export const SLOT_DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

// D_M_YYYY con guiones bajos: contrato actual de book-appointment.
export const BOOK_SLOT_DATE_PATTERN = /^\d{1,2}_\d{1,2}_\d{4}$/;

// HH:MM AM/PM con hora 1..12: contrato de slotTime.
export const SLOT_TIME_PATTERN = /^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

// E.164: '+' y 2..15 dígitos sin espacios ni guiones (p. ej. +573001234567).
export const PHONE_E164_PATTERN = /^\+[1-9]\d{1,14}$/;

// ObjectId de MongoDB: 24 dígitos hexadecimales.
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Email válido (la lógica vive en class-validator, ya instalado).
export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && isEmailFormat(value);
}

// Teléfono en formato E.164 (p. ej. +573001234567).
export function isPhoneE164(value: unknown): value is string {
  return typeof value === 'string' && PHONE_E164_PATTERN.test(value);
}

/**
 * ObjectId de 24 hex. Más estricto que IsMongoId (que admite también
 * cadenas de 12 bytes); aquí el contrato es hex de 24 caracteres.
 */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

/**
 * Fecha de slot DD/MM/YYYY válida. Ver el AFD en la cabecera del archivo.
 * O(1): una regex, tres guardas y un round-trip.
 */
export function isSlotDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!SLOT_DATE_PATTERN.test(value)) return false;
  const dd = Number(value.slice(0, 2));
  const mm = Number(value.slice(3, 5));
  const yyyy = Number(value.slice(6, 10));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  if (yyyy < 100) return false; // Date(y<100) => 1900+y: ver AFD
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return (
    d.getUTCDate() === dd &&
    d.getUTCMonth() === mm - 1 &&
    d.getUTCFullYear() === yyyy
  );
}
