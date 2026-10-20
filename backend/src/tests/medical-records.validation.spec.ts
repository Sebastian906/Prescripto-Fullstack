import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CLINICAL_FIELD_KEYS,
  stripClinicalFields,
} from 'src/appointments/schemas/appointment.schema';
import {
  decryptField,
  encryptField,
  isEncryptedField,
} from 'src/shared/utils/encryption.util';
import { CreateMedicalRecordDto } from '../medical-records/dto/create-medical-record.dto';

const KEY = Buffer.alloc(32, 3).toString('base64');

async function validateDto(payload: Record<string, unknown>) {
  return validate(plainToInstance(CreateMedicalRecordDto, payload));
}

describe('MedicalRecord validation and encryption', () => {
  beforeAll(() => {
    process.env.MEDICAL_RECORDS_ENC_KEY = KEY;
  });

  it('rejects a diagnosis outside the closed catalog', async () => {
    const errors = await validateDto({
      appointmentId: '64f1a2b3c4d5e6f7a8b9c0d1',
      diagnosis: 'flu',
      notes: 'free text',
    });
    expect(errors.some((e) => e.property === 'diagnosis')).toBe(true);
  });

  it('accepts a catalog diagnosis', async () => {
    const errors = await validateDto({
      appointmentId: '64f1a2b3c4d5e6f7a8b9c0d1',
      diagnosis: 'upper-respiratory-infection',
      notes: 'bounded note',
    });
    expect(errors).toHaveLength(0);
  });

  it('encrypts and decrypts notes with a fresh IV per call', () => {
    const first = encryptField('sensitive');
    const second = encryptField('sensitive');

    expect(isEncryptedField(first)).toBe(true);
    expect(first).not.toBe(second);
    expect(first).not.toContain('sensitive');
    expect(decryptField(first)).toBe('sensitive');
  });

  it('strips every clinical key from appointment snapshots (F-02)', () => {
    const input: Record<string, unknown> = { name: 'Patient', email: 'p@x' };
    for (const key of CLINICAL_FIELD_KEYS) input[key] = 'clinical';

    const clean = stripClinicalFields(input);
    expect(clean).toEqual({ name: 'Patient', email: 'p@x' });
    for (const key of CLINICAL_FIELD_KEYS) {
      expect(clean).not.toHaveProperty(key);
    }
  });
});
