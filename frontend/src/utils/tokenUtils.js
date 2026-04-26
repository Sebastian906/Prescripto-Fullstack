export const sanitizeToken = (raw) => {
    if (typeof raw !== 'string') return ''
    return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(raw) ? raw : ''
}