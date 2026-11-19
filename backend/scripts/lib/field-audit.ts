import {
  DEFAULT_PHONE_REGION,
  GENDER_VALUES,
  isIsoDate,
  isPhoneE164,
  normalizeDob,
  normalizeGender,
  normalizePhone,
} from '../../src/shared/utils/validators';

export type FieldDecisionKind = 'keep' | 'write' | 'quarantine';

export interface FieldDecision {
  next: string | null;
  kind: FieldDecisionKind;
  blank: boolean;
  reason?: string;
}

export interface FieldDecisions {
  phone: FieldDecision;
  gender: FieldDecision;
  dob: FieldDecision;
}

export interface FieldCounts {
  total: number;
  keep: number;
  write: number;
  quarantine: number;
  blank: number;
}

export function emptyCounts(): FieldCounts {
  return { total: 0, keep: 0, write: 0, quarantine: 0, blank: 0 };
}

export function tally(counts: FieldCounts, decision: FieldDecision): void {
  counts.total += 1;
  counts[decision.kind] += 1;
  if (decision.blank) counts.blank += 1;
}

export function assertNoLoss(name: string, counts: FieldCounts): void {
  const classified = counts.keep + counts.write + counts.quarantine;
  if (classified !== counts.total) {
    throw new Error(`${name}: ${classified}/${counts.total} clasificados`);
  }
}

function rawString(value: unknown): string {
  if (typeof value === 'string') return value;
  return value == null ? '' : String(value);
}

export function decideFields(
  raw: Record<string, any>,
  defaultRegion = DEFAULT_PHONE_REGION,
): FieldDecisions {
  const phoneRaw = rawString(raw.phone);
  const phoneNext = normalizePhone(phoneRaw, defaultRegion);
  let phone: FieldDecision;
  if (phoneNext === '') {
    phone = {
      next: '',
      kind: phoneRaw === '' ? 'keep' : 'write',
      blank: true,
    };
  } else if (isPhoneE164(phoneNext)) {
    phone = {
      next: phoneNext,
      kind: phoneNext === phoneRaw ? 'keep' : 'write',
      blank: false,
    };
  } else {
    phone = {
      next: phoneRaw,
      kind: 'quarantine',
      blank: false,
      reason: 'no es E.164 ni un local de 10 dígitos',
    };
  }

  const genderRaw = rawString(raw.gender).trim();
  const genderNext = normalizeGender(genderRaw);
  let gender: FieldDecision;
  if (!(GENDER_VALUES as readonly string[]).includes(genderNext)) {
    gender = {
      next: genderRaw,
      kind: 'quarantine',
      blank: false,
      reason: 'fuera del enum de género',
    };
  } else {
    gender = {
      next: genderNext,
      kind: genderNext === genderRaw ? 'keep' : 'write',
      blank:
        genderRaw === '' ||
        genderRaw === 'Not Selected' ||
        genderRaw === 'Unspecified',
    };
  }

  const dobRaw = rawString(raw.dob).trim();
  const dobNext = normalizeDob(dobRaw);
  let dob: FieldDecision;
  if (dobNext === '') {
    dob = {
      next: null,
      kind: raw.dob == null ? 'keep' : 'write',
      blank: true,
    };
  } else if (isIsoDate(dobNext)) {
    dob = {
      next: dobNext,
      kind: dobNext === dobRaw ? 'keep' : 'write',
      blank: false,
    };
  } else {
    dob = {
      next: dobRaw,
      kind: 'quarantine',
      blank: false,
      reason: 'no es YYYY-MM-DD ni DD/MM/YYYY',
    };
  }

  return { phone, gender, dob };
}
