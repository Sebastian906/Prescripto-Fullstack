import { CLINICAL_UNSET_PATHS } from 'src/appointments/schemas/appointment.schema';
import { backfillMedicalRecords } from 'src/migration/migration.service';
import { decryptField } from 'src/shared/utils/encryption.util';
import { DiagnosisCode } from 'src/medical-records/catalog/diagnosis.catalog';

const KEY = Buffer.alloc(32, 5).toString('base64');

function fakeAppointments(rows: unknown[]) {
  const updateOne = jest.fn(() => ({ exec: () => Promise.resolve({}) }));
  const find = jest.fn(() => ({
    lean: () => ({
      cursor: () =>
        (function* () {
          for (const row of rows) yield row;
        })(),
    }),
  }));
  return { model: { find, updateOne } as any, updateOne };
}

function fakeRecords(seen = new Set<string>()) {
  const updateOne = jest.fn(
    (filter: { appointmentId: string }, _update: unknown) => ({
      exec: () => {
        if (seen.has(filter.appointmentId)) {
          return Promise.resolve({ upsertedCount: 0 });
        }
        seen.add(filter.appointmentId);
        return Promise.resolve({ upsertedCount: 1 });
      },
    }),
  );
  return { model: { updateOne } as any, updateOne };
}

describe('backfillMedicalRecords', () => {
  beforeAll(() => {
    process.env.MEDICAL_RECORDS_ENC_KEY = KEY;
  });

  it('is idempotent and never overwrites existing records', async () => {
    const appointment = {
      _id: '64f1a2b3c4d5e6f7a8b9c0d1',
      userId: 'u1',
      docId: 'd1',
      userData: { diagnosis: 'flu', notes: 'legacy note' },
      docData: {},
    };
    const appointments = fakeAppointments([appointment]);
    const seen = new Set<string>();
    const records = fakeRecords(seen);

    const first = await backfillMedicalRecords(
      appointments.model,
      records.model,
    );
    const second = await backfillMedicalRecords(
      appointments.model,
      records.model,
    );

    expect(first.migrated).toBe(1);
    expect(second.migrated).toBe(0);
    expect(second.skipped).toBe(1);
    expect(records.updateOne).toHaveBeenCalledTimes(2);

    const insert = (
      records.updateOne.mock.calls[0][1] as {
        $setOnInsert: { diagnosis: string; notes: string };
      }
    ).$setOnInsert;
    expect(insert.diagnosis).toBe(DiagnosisCode.UnclassifiedLegacy);
    expect(insert.notes).not.toBe('legacy note');
    expect(decryptField(insert.notes)).toBe('legacy note');
  });

  it('preserves docData notes and structured clinical keys before unsetting', async () => {
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d4',
        userId: 'u1',
        docId: 'd1',
        userData: {
          notes: 'patient note',
          prescription: 'med A',
          symptoms: 'fever',
        },
        docData: {
          notes: 'doctor note',
          clinicalNotes: 'doctor clinical',
          treatment: 'rest',
          prescription: 'med B',
          symptoms: 'cough',
        },
      },
    ]);
    const records = fakeRecords();

    await backfillMedicalRecords(appointments.model, records.model);

    const insert = (
      records.updateOne.mock.calls[0][1] as {
        $setOnInsert: { notes: string };
      }
    ).$setOnInsert;
    const notes = decryptField(insert.notes);

    expect(notes).toContain('patient note');
    expect(notes).toContain('doctor note');
    expect(notes).toContain('doctor clinical');
    expect(notes).toContain('prescription: med A'); // firstNonEmpty: userData gana
    expect(notes).toContain('treatment: rest');
    expect(notes).toContain('symptoms: fever'); // firstNonEmpty: userData gana

    expect(appointments.updateOne).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { $unset: CLINICAL_UNSET_PATHS },
    );
  });

  it('unsets clinical keys from the appointment after copying', async () => {
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d2',
        userId: 'u1',
        docId: 'd1',
        userData: { notes: 'legacy note' },
        docData: {},
      },
    ]);
    const records = fakeRecords();

    await backfillMedicalRecords(appointments.model, records.model);

    expect(appointments.updateOne).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { $unset: CLINICAL_UNSET_PATHS },
    );
  });

  it('skips appointments without clinical keys', async () => {
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d3',
        userId: 'u1',
        docId: 'd1',
        userData: { name: 'Patient' },
        docData: {},
      },
    ]);
    const records = fakeRecords();

    const result = await backfillMedicalRecords(
      appointments.model,
      records.model,
    );

    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(records.updateOne).not.toHaveBeenCalled();
  });
});
