import {
  isEmail,
  isObjectId,
  isPhoneE164,
  isSlotDate,
} from 'src/shared/utils/validators';

const p2 = (n: number): string => String(n).padStart(2, '0');
const p3 = (n: number): string => String(n).padStart(3, '0');
const p4 = (n: number): string => String(n).padStart(4, '0');

describe('isSlotDate — golden válido', () => {
  const valid = [
    '01/01/2026',
    '28/02/2025',
    '29/02/2024',
    '29/02/2000',
    '01/01/0100',
    '30/04/2026',
    '31/07/2025',
    '31/12/2026',
  ];
  it.each(valid)('acepta %s', (d) => {
    expect(isSlotDate(d)).toBe(true);
  });
});

describe('isSlotDate — golden inválido', () => {
  const invalid = [
    '32/13/2026',
    '29/02/2025',
    '29/02/2100',
    '29/02/1900',
    '31/04/2026',
    '31/02/2026',
    '00/01/2026',
    '01/00/2026',
    '01/01/0099',
    '01/01/0026',
    '1/1/26',
    '15/7/2025',
    '2026-01-01',
    '01/01/202',
    '01/01/20266',
    '0a/01/2026',
    '01/01/2026x',
    '011/01/2026',
    '01/01/2026 extra',
    '',
  ];
  it.each(invalid)('rechaza %s', (d) => {
    expect(isSlotDate(d)).toBe(false);
  });
  it('rechaza no-strings', () => {
    expect(isSlotDate(null)).toBe(false);
    expect(isSlotDate(undefined)).toBe(false);
    expect(isSlotDate(123)).toBe(false);
    expect(isSlotDate({})).toBe(false);
  });
});

describe('isSlotDate — años bisiestos', () => {
  const leaps = [1996, 2000, 2016, 2020, 2024, 2048, 2400];
  it.each(leaps)('acepta 29/02/%i (bisiesto)', (y) => {
    expect(isSlotDate(`29/02/${p4(y)}`)).toBe(true);
  });
  const nonLeaps = [1900, 2001, 2023, 2025, 2100, 2200];
  it.each(nonLeaps)('rechaza 29/02/%i (no bisiesto)', (y) => {
    expect(isSlotDate(`29/02/${p4(y)}`)).toBe(false);
  });
});

// Fuzz determinista: misma semilla y misma tabla de estrategias que
// chat/internal/bot/validators_test.go (los 500 casos son idénticos en
// ambos stacks). Cada estrategia produce una fecha inválida por
// construcción, así que el generador no puede "fallar" hacia un válido.
describe('isSlotDate — fuzz determinista (500 inválidas)', () => {
  it('genera 500 casos y ninguno debe ser aceptado', () => {
    let seed = 20261004;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed;
    };
    const nonLeap = [2025, 2023, 2021, 2100, 1900, 2026, 2027, 2029];
    const months30 = [4, 6, 9, 11];
    const accepted: string[] = [];
    for (let i = 0; i < 500; i++) {
      const r1 = next();
      const r2 = next();
      const dd = 1 + (r1 % 28);
      const mm = 1 + (r1 % 12);
      const yyyy = 1900 + (r2 % 300);
      let s: string;
      switch (i % 10) {
        case 0:
          s = `32/${p2(mm)}/${p4(yyyy)}`;
          break;
        case 1:
          s = `${p2(dd)}/13/${p4(yyyy)}`;
          break;
        case 2:
          s = `00/${p2(mm)}/${p4(yyyy)}`;
          break;
        case 3:
          s = `${p2(dd)}/00/${p4(yyyy)}`;
          break;
        case 4:
          s = `29/02/${p4(nonLeap[i % 8])}`;
          break;
        case 5:
          s = `31/${p2(months30[i % 4])}/${p4(yyyy)}`;
          break;
        case 6:
          s = `31/02/${p4(yyyy)}`;
          break;
        case 7:
          s = `${1 + (r1 % 9)}/${1 + (r1 % 9)}/${p4(yyyy)}`;
          break;
        case 8:
          s = `${p4(yyyy)}-${p2(mm)}-${p2(dd)}`;
          break;
        default:
          s = `${p2(dd)}/${p2(mm)}/${p3(100 + (r2 % 900))}`;
          break;
      }
      if (isSlotDate(s)) accepted.push(s);
    }
    expect(accepted).toHaveLength(0);
    expect(accepted).toEqual([]);
  });
});

describe('isPhoneE164', () => {
  const valid = [
    '+573001234567',
    '+14155552671',
    '+447911123456',
    '+999999999999999',
  ];
  it.each(valid)('acepta %s', (p) => {
    expect(isPhoneE164(p)).toBe(true);
  });
  const invalid = [
    '573001234567',
    '+57 300 123456',
    '+57-300-123456',
    '+0123',
    '+',
    '++57300',
    '00573001234567',
    '+573001234567890123',
    'tel:+573001234567',
    '',
  ];
  it.each(invalid)('rechaza %s', (p) => {
    expect(isPhoneE164(p)).toBe(false);
  });
  it('rechaza no-strings', () => {
    expect(isPhoneE164(null)).toBe(false);
    expect(isPhoneE164(573001234567)).toBe(false);
  });
});

describe('isEmail', () => {
  const valid = [
    'john.doe@example.com',
    'a@b.co',
    'user+tag@sub.example.org',
    'admin@prescripto.io',
  ];
  it.each(valid)('acepta %s', (e) => {
    expect(isEmail(e)).toBe(true);
  });
  const invalid = [
    'not-an-email',
    'a@b',
    '@example.com',
    'a@@b.com',
    'a b@c.com',
    'john.doe@',
    '',
  ];
  it.each(invalid)('rechaza %s', (e) => {
    expect(isEmail(e)).toBe(false);
  });
  it('rechaza no-strings', () => {
    expect(isEmail(null)).toBe(false);
    expect(isEmail(42)).toBe(false);
  });
});

describe('isObjectId', () => {
  const valid = [
    '64f1a2b3c4d5e6f7a8b9c0d1',
    '64F1A2B3C4D5E6F7A8B9C0D1',
    '000000000000000000000000',
  ];
  it.each(valid)('acepta %s', (id) => {
    expect(isObjectId(id)).toBe(true);
  });
  const invalid = [
    '64f1a2b3c4d5e6f7a8b9c0d', // 23 hex
    '64f1a2b3c4d5e6f7a8b9c0d11', // 25 hex
    'z4f1a2b3c4d5e6f7a8b9c0d1', // no hex
    'not-an-objectid',
    '',
  ];
  it.each(invalid)('rechaza %s', (id) => {
    expect(isObjectId(id)).toBe(false);
  });
  it('rechaza no-strings', () => {
    expect(isObjectId(null)).toBe(false);
    expect(isObjectId(123)).toBe(false);
  });
});
