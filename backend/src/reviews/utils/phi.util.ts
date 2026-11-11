import { PHI_KEYWORDS } from './phi-keywords';

export type PHIReason = 'email' | 'phone' | 'diagnosis';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{5,}\d/g;
// Fechas y precios agrupados por miles no son teléfonos.
const DATE_RE = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/;
const GROUPED_PRICE_RE = /^\d{1,3}([.,\s]\d{3})+$/;

/** Escapa un literal para usarlo dentro de un RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Compilado una sola vez; \p{L} evita coincidencias dentro de otras palabras.
const KEYWORD_PATTERNS = PHI_KEYWORDS.map(
  (keyword) =>
    new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(keyword)}(?![\\p{L}\\p{N}])`,
      'iu',
    ),
);

/**
 * Detecta datos personales o diagnósticos en texto libre.
 * No pretende ser un clasificador clínico: es un filtro de abuso barato.
 */
export function containsPHI(text: string): PHIReason | null {
  if (!text) return null;

  if (EMAIL_RE.test(text)) return 'email';

  const candidates = text.match(PHONE_CANDIDATE_RE) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) continue;
    if (DATE_RE.test(candidate) || GROUPED_PRICE_RE.test(candidate)) continue;
    return 'phone';
  }

  if (KEYWORD_PATTERNS.some((pattern) => pattern.test(text))) {
    return 'diagnosis';
  }

  return null;
}
