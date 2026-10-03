export enum ReferralReason {
  GeneralConsultation = 'general-consultation',
  CardiologyEvaluation = 'cardiology-evaluation',
  DermatologyConsult = 'dermatology-consult',
  NeurologyReview = 'neurology-review',
  OrthopedicsReview = 'orthopedics-review',
  RadiologyImaging = 'radiology-imaging',
  LabWorkup = 'lab-workup',
  OncologyScreening = 'oncology-screening',
}

export const REFERRAL_REASONS: string[] = Object.values(ReferralReason);

export function isReferralReason(value: unknown): value is ReferralReason {
  return typeof value === 'string' && REFERRAL_REASONS.includes(value);
}
