export enum DiagnosisCode {
  GeneralConsultation = 'general-consultation',
  UpperRespiratoryInfection = 'upper-respiratory-infection',
  Hypertension = 'hypertension',
  Type2Diabetes = 'type-2-diabetes',
  Migraine = 'migraine',
  Dermatitis = 'dermatitis',
  Gastroenteritis = 'gastroenteritis',
  MusculoskeletalPain = 'musculoskeletal-pain',
  AnxietyDisorder = 'anxiety-disorder',
  FollowUp = 'follow-up',
  UnclassifiedLegacy = 'unclassified-legacy',
}

export const DIAGNOSIS_CODES: string[] = Object.values(DiagnosisCode);

export const WRITABLE_DIAGNOSIS_CODES: string[] = DIAGNOSIS_CODES.filter(
  (code) => code !== String(DiagnosisCode.UnclassifiedLegacy),
);

export function isDiagnosisCode(value: unknown): value is DiagnosisCode {
  return typeof value === 'string' && DIAGNOSIS_CODES.includes(value);
}

export function isWritableDiagnosisCode(
  value: unknown,
): value is DiagnosisCode {
  return typeof value === 'string' && WRITABLE_DIAGNOSIS_CODES.includes(value);
}
