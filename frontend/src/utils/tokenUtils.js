export const sanitizeToken = (raw) => {
    if (typeof raw !== 'string') return ''
    // acepta padding = y solo JWT 3 partes
    return /^[\w-]+\.[\w-]+\.[\w-]+={0,2}$/.test(raw) ? raw : ''
}