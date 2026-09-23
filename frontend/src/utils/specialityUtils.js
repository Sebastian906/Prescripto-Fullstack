export const SPECIALITY_MAP = [
    { db: 'General physician', i18nKey: 'doctorsPage.specialty.generalPhysician', urlParam: 'General physician' },
    { db: 'Gynecologist', i18nKey: 'doctorsPage.specialty.gynecologist', urlParam: 'Gynecologist' },
    { db: 'Dermatologist', i18nKey: 'doctorsPage.specialty.dermatologist', urlParam: 'Dermatologist' },
    { db: 'Pediatricians', i18nKey: 'doctorsPage.specialty.pediatricians', urlParam: 'Pediatricians' },
    { db: 'Neurologist', i18nKey: 'doctorsPage.specialty.neurologist', urlParam: 'Neurologist' },
    { db: 'Gastroenterologist', i18nKey: 'doctorsPage.specialty.gastroenterologist', urlParam: 'Gastroenterologist' },
]

export const EXPERIENCE_MAP = [
    { db: '1 Year', i18nKey: 'addDoctor.years.1' },
    { db: '2 Years', i18nKey: 'addDoctor.years.2' },
    { db: '3 Years', i18nKey: 'addDoctor.years.3' },
    { db: '4 Years', i18nKey: 'addDoctor.years.4' },
    { db: '5 Years', i18nKey: 'addDoctor.years.5' },
    { db: '6 Years', i18nKey: 'addDoctor.years.6' },
    { db: '7 Years', i18nKey: 'addDoctor.years.7' },
    { db: '8 Years', i18nKey: 'addDoctor.years.8' },
    { db: '9 Years', i18nKey: 'addDoctor.years.9' },
    { db: '+10 Years', i18nKey: 'addDoctor.years.10' },
]

export function translateSpeciality(dbValue, t) {
    const entry = SPECIALITY_MAP.find(s => s.db === dbValue)
    if (!entry) return dbValue
    return t(entry.i18nKey)
}

export function translateExperience(dbValue, t) {
    const entry = EXPERIENCE_MAP.find(e => e.db === dbValue)
    if (!entry) return dbValue
    return t(entry.i18nKey)
}

export function translateAbout(dbValue, t) {
    if (!dbValue) return ''
    // Intenta traducir el valor directamente como clave i18n
    // Si no existe, devuelve el valor original como fallback
    return t(dbValue, { defaultValue: dbValue })
}

export function dbValueFromUrlParam(urlParam) {
    if (!urlParam) return null
    const entry = SPECIALITY_MAP.find(s => s.urlParam === urlParam)
    return entry ? entry.db : null
}

// canonical — mirrored in admin/src/utils/specialityUtils.js (keep identical)
// mirror of frontend/src/utils/specialityUtils.js — keep identical
/**
 * Normaliza texto para búsqueda insensible a mayúsculas, tildes y espacios.
 * Espejo semántico de `normalize()` en Go (chat/internal/bot/engine.go).
 * @param {*} value - Valor a normalizar (null/undefined devuelven '').
 * @returns {string} Texto en minúsculas, sin diacríticos, sin puntuación, con espacios colapsados.
 * @complexity O(n) — pasadas lineales sobre la cadena.
 */
export function normalizeSearch(value) {
    if (value == null) return ''
    return String(value)
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N} ]+/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
}