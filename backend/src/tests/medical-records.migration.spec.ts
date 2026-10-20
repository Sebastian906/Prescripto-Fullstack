import { CLINICAL_UNSET_PATHS } from 'src/appointments/schemas/appointment.schema';
import { backfillMedicalRecords } from 'src/migration/migration.service';
import { decryptField } from 'src/shared/utils/encryption.util';
import { DiagnosisCode } from 'src/medical-records/catalog/diagnosis.catalog';
import { LEGACY_BACKFILL_SOURCE } from 'src/medical-records/schemas/medical-record.schema';

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

type FakeRecordOptions = {
  existingSource?: string;
  rejectUpdate?: boolean;
};

function fakeRecords(options: FakeRecordOptions = {}) {
  const sources = new Map<string, string>();
  const updateOne = jest.fn(
    (
      filter: { appointmentId: string },
      update: { $setOnInsert?: { source?: string } },
    ) => ({
      exec: () => {
        if (options.rejectUpdate) {
          return Promise.reject(new Error('record write failed'));
        }
        if (options.existingSource || sources.has(filter.appointmentId)) {
          return Promise.resolve({ upsertedCount: 0, matchedCount: 1 });
        }
        sources.set(
          filter.appointmentId,
          update.$setOnInsert?.source ?? 'manual',
        );
        return Promise.resolve({ upsertedCount: 1 });
      },
    }),
  );
  const findOne = jest.fn((filter: { appointmentId: string }) => ({
    select: () => ({
      lean: () => ({
        exec: () =>
          Promise.resolve(
            options.existingSource
              ? { source: options.existingSource }
              : sources.has(filter.appointmentId)
                ? { source: sources.get(filter.appointmentId) }
                : null,
          ),
      }),
    }),
  }));
  return { model: { updateOne, findOne } as any, updateOne, findOne };
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
    const records = fakeRecords();

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
        $setOnInsert: { diagnosis: string; notes: string; source?: string };
      }
    ).$setOnInsert;
    expect(insert.diagnosis).toBe(DiagnosisCode.UnclassifiedLegacy);
    expect(insert.notes).not.toBe('legacy note');
    expect(decryptField(insert.notes)).toBe('legacy note');
    expect(insert.source).toBe(LEGACY_BACKFILL_SOURCE);
  });

  it('preserves legacy clinical fields when a record already exists from another source', async () => {
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d5',
        userId: 'u1',
        docId: 'd1',
        userData: { notes: 'legacy note' },
        docData: {},
      },
    ]);
    const records = fakeRecords({ existingSource: 'manual' });

    const result = await backfillMedicalRecords(
      appointments.model,
      records.model,
    );

    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(1);
    expect(result.errorDetails?.[0]).toContain(
      'legacy clinical fields preserved',
    );
    expect(records.updateOne).toHaveBeenCalledTimes(1);
    expect(appointments.updateOne).not.toHaveBeenCalled();
  });

  it('counts an error and leaves the appointment untouched when the record write fails', async () => {
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d6',
        userId: 'u1',
        docId: 'd1',
        userData: { notes: 'legacy note' },
        docData: {},
      },
    ]);
    const records = fakeRecords({ rejectUpdate: true });

    const result = await backfillMedicalRecords(
      appointments.model,
      records.model,
    );

    expect(result.migrated).toBe(0);
    expect(result.errors).toBe(1);
    expect(result.errorDetails?.[0]).toContain('record write failed');
    expect(appointments.updateOne).not.toHaveBeenCalled();
  });

  it('serializes non-string clinical values instead of dropping them', async () => {
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d7',
        userId: 'u1',
        docId: 'd1',
        userData: {
          notes: 123,
          prescription: ['med A', 'med B'],
          treatment: { plan: 'rest' },
          symptoms: true,
        },
        docData: { clinicalNotes: { note: 'doctor' } },
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

    expect(notes).toContain('123');
    expect(notes).toContain('["med A","med B"]');
    expect(notes).toContain('{"plan":"rest"}');
    expect(notes).toContain('true');
    expect(notes).toContain('{"note":"doctor"}');
  });

  it('counts an error and skips writes when a clinical value cannot be serialized', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const appointments = fakeAppointments([
      {
        _id: '64f1a2b3c4d5e6f7a8b9c0d8',
        userId: 'u1',
        docId: 'd1',
        userData: { notes: circular },
        docData: {},
      },
    ]);
    const records = fakeRecords();

    const result = await backfillMedicalRecords(
      appointments.model,
      records.model,
    );

    expect(result.migrated).toBe(0);
    expect(result.errors).toBe(1);
    expect(records.updateOne).not.toHaveBeenCalled();
    expect(appointments.updateOne).not.toHaveBeenCalled();
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
