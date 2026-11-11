import { PHI_KEYWORDS } from './phi-keywords';

export type PHIReason = 'email' | 'phone' | 'diagnosis';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{5,}\d/g;

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
    if (digits.length >= 7 && digits.length <= 15) return 'phone';
  }

  const normalized = text.toLocaleLowerCase('es');
  if (PHI_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'diagnosis';
  }

  return null;
}
