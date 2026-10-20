import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { decryptField } from 'src/shared/utils/encryption.util';
import { MedicalRecordsService } from '../medical-records/medical-records.service';

const KEY = Buffer.alloc(32, 9).toString('base64');
// ObjectId válido: findOrFail lo valida antes del chequeo de propiedad.
const RECORD_ID = '64f1a2b3c4d5e6f7a8b9c0d1';

function chainExec(value: unknown) {
  return { exec: () => Promise.resolve(value) };
}

function buildService(
  overrides: {
    appointment?: Record<string, unknown> | null;
    record?: Record<string, unknown> | null;
    records?: Record<string, unknown>[];
    hasConsent?: boolean;
    createError?: Error;
  } = {},
) {
  const create = jest.fn(() =>
    overrides.createError
      ? Promise.reject(overrides.createError)
      : Promise.resolve({ _id: 'r1' }),
  );
  const appointmentModel = {
    findById: jest.fn(() => ({
      lean: () => chainExec(overrides.appointment ?? null),
    })),
    countDocuments: jest.fn(() => chainExec(0)),
  };
  const model = {
    create,
    find: jest.fn(() => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => chainExec(overrides.records ?? []),
          }),
        }),
      }),
    })),
    findById: jest.fn(() => ({
      lean: () => chainExec(overrides.record ?? null),
    })),
    countDocuments: jest.fn(() => chainExec(0)),
    findOne: jest.fn(() => ({
      sort: () => ({
        select: () => ({ lean: () => chainExec(null) }),
      }),
    })),
  };
  const consents = {
    hasGrantedScope: jest.fn(() =>
      Promise.resolve(overrides.hasConsent ?? true),
    ),
  };
  const audit = { record: jest.fn(() => Promise.resolve({})) };

  const service = new MedicalRecordsService(
    model as any,
    appointmentModel as any,
    consents as any,
    audit as any,
  );
  return { service, model, appointmentModel, consents, audit, create };
}

const completedAppointment = {
  _id: 'a1',
  userId: 'u1',
  docId: 'd1',
  isCompleted: true,
};

describe('MedicalRecordsService', () => {
  beforeAll(() => {
    process.env.MEDICAL_RECORDS_ENC_KEY = KEY;
  });

  it('403 when there is no active treatment consent', async () => {
    const { service, create } = buildService({
      appointment: completedAppointment,
      hasConsent: false,
    });
    await expect(
      service.create('d1', {
        appointmentId: 'a1',
        diagnosis: 'follow-up',
        notes: 'secret',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('403 when the doctor does not own the appointment', async () => {
    const { service } = buildService({ appointment: completedAppointment });
    await expect(
      service.create('d2', {
        appointmentId: 'a1',
        diagnosis: 'follow-up',
        notes: 'secret',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('400 when the appointment is not completed', async () => {
    const { service } = buildService({
      appointment: { ...completedAppointment, isCompleted: false },
    });
    await expect(
      service.create('d1', {
        appointmentId: 'a1',
        diagnosis: 'follow-up',
        notes: 'secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates the record and encrypts notes at rest', async () => {
    const { service, create, audit } = buildService({
      appointment: completedAppointment,
    });
    const result = await service.create('d1', {
      appointmentId: 'a1',
      diagnosis: 'follow-up',
      notes: 'secret clinical text',
    });

    expect(result).toEqual({ success: true, id: 'r1' });
    const payload = create.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.notes).not.toBe('secret clinical text');
    expect(decryptField(payload.notes as string)).toBe('secret clinical text');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'medical_record.created',
        meta: { appointmentId: 'a1' },
      }),
    );
    expect(JSON.stringify(audit.record.mock.calls[0][0])).not.toContain(
      'secret clinical text',
    );
  });

  it('409 on a duplicate appointmentId (double write)', async () => {
    const { service } = buildService({
      appointment: completedAppointment,
      createError: Object.assign(new Error('duplicate key'), { code: 11000 }),
    });
    await expect(
      service.create('d1', {
        appointmentId: 'a1',
        diagnosis: 'follow-up',
        notes: 'secret',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('patient reads own record but not another patient record', async () => {
    const record = {
      _id: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      appointmentId: 'a1',
      diagnosis: 'follow-up',
      notes: decryptField(''),
    };
    const { service } = buildService({ record });

    await expect(service.getForPatient('u2', RECORD_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getForPatient('u1', RECORD_ID)).resolves.toMatchObject(
      { _id: RECORD_ID },
    );
  });

  it('doctor reads own patient record but not another doctor record', async () => {
    const record = {
      _id: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      appointmentId: 'a1',
      diagnosis: 'follow-up',
      notes: '',
    };
    const { service } = buildService({ record });

    await expect(service.getForDoctor('d2', RECORD_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getForDoctor('d1', RECORD_ID)).resolves.toMatchObject({
      _id: RECORD_ID,
    });
  });

  it('status returns metadata only, never notes', async () => {
    const { service, model, appointmentModel } = buildService();
    model.countDocuments = jest
      .fn()
      .mockReturnValueOnce(chainExec(3))
      .mockReturnValueOnce(chainExec(2));
    const status = await service.getStatus();

    expect(status).toEqual({
      total: 3,
      encrypted: 2,
      migratedAt: null,
      pending: 0,
    });
    expect(JSON.stringify(status)).not.toContain('notes');
    expect(appointmentModel.countDocuments).toHaveBeenCalled();
  });
});
