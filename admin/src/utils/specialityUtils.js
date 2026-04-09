export const SPECIALITY_I18N_MAP = {
    'General physician':  'specialityNames.generalPhysician',
    'Gynecologist':       'specialityNames.gynecologist',
    'Dermatologist':      'specialityNames.dermatologist',
    'Pediatricians':      'specialityNames.pediatricians',
    'Neurologist':        'specialityNames.neurologist',
    'Gastroenterologist': 'specialityNames.gastroenterologist',
}

export const EXPERIENCE_I18N_MAP = {
    '1 Year': 'addDoctor.years.1',
    '2 Years': 'addDoctor.years.2',
    '3 Years': 'addDoctor.years.3',
    '4 Years': 'addDoctor.years.4',
    '5 Years': 'addDoctor.years.5',
    '6 Years': 'addDoctor.years.6',
    '7 Years': 'addDoctor.years.7',
    '8 Years': 'addDoctor.years.8',
    '9 Years': 'addDoctor.years.9',
    '+10 Years': 'addDoctor.years.10',
}

export function translateSpeciality(dbValue, t) {
    const key = SPECIALITY_I18N_MAP[dbValue]
    if (!key) return dbValue
    return t(key)
}

export function translateExperience(dbValue, t) {
    const key = EXPERIENCE_I18N_MAP[dbValue]
    if (!key) return dbValue
    return t(key)
}

export function translateAbout(dbValue, t) {
    if (!dbValue) return ''
    // Intenta traducir el valor directamente como clave i18n
    // Si no existe, devuelve el valor original como fallback
    return t(dbValue, { defaultValue: dbValue })
}