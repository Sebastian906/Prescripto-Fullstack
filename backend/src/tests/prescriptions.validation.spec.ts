import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePrescriptionDto } from '../prescriptions/dto/create-prescription.dto';

const RECORD_ID = '64f1a2b3c4d5e6f7a8b9c0d1';
const validItem = {
  drug: 'amoxicillin',
  dose: '500 mg',
  frequency: 'every 8 hours',
  days: 7,
};

async function validateDto(payload: Record<string, unknown>) {
  return validate(plainToInstance(CreatePrescriptionDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('Prescription DTO validation', () => {
  it('accepts a structured prescription', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      items: [validItem],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-ObjectId recordId', async () => {
    const errors = await validateDto({ recordId: 'nope', items: [validItem] });
    expect(errors.some((e) => e.property === 'recordId')).toBe(true);
  });

  it('rejects an empty items array', async () => {
    const errors = await validateDto({ recordId: RECORD_ID, items: [] });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects more than 25 items', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      items: Array.from({ length: 26 }, () => ({ ...validItem })),
    });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects a missing drug', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      items: [{ ...validItem, drug: undefined }],
    });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects a drug shorter than 2 characters', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      items: [{ ...validItem, drug: 'a' }],
    });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects non-integer days', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      items: [{ ...validItem, days: 7.5 }],
    });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects days outside 1..365', async () => {
    for (const days of [0, 366]) {
      const errors = await validateDto({
        recordId: RECORD_ID,
        items: [{ ...validItem, days }],
      });
      expect(errors.some((e) => e.property === 'items')).toBe(true);
    }
  });

  it('rejects free-text dosage fields instead of parsing prose', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      items: [
        { drug: 'amoxicillin', dosage: '500 mg every 8 hours for 7 days' },
      ],
    });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects standalone clinical identity fields (derives from E-03)', async () => {
    const errors = await validateDto({
      recordId: RECORD_ID,
      userId: 'u2',
      items: [validItem],
    });
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });
});
