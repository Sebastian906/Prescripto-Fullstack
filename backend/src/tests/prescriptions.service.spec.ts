import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { PrescriptionSchema } from '../prescriptions/schemas/prescription.schema';

const P_ID = '64f1a2b3c4d5e6f7a8b9c0d1';
const RECORD_ID = '64f1a2b3c4d5e6f7a8b9c0d2';
const items = [
  {
    drug: 'amoxicillin',
    dose: '500 mg',
    frequency: 'every 8 hours',
    days: 7,
  },
];

function chainExec(value: unknown) {
  return { exec: () => Promise.resolve(value) };
}

type Overrides = {
  record?: Record<string, unknown> | null;
  prescription?: Record<string, unknown> | null;
  prescriptions?: Record<string, unknown>[];
  hasConsent?: boolean;
  createError?: Error;
};

function buildService(overrides: Overrides = {}) {
  const create = jest.fn((_payload: Record<string, unknown>) =>
    overrides.createError
      ? Promise.reject(overrides.createError)
      : Promise.resolve({ _id: P_ID }),
  );

  const model: any = {
    create,
    find: jest.fn(() => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => chainExec(overrides.prescriptions ?? []),
          }),
        }),
      }),
    })),
    findById: jest.fn(() => ({
      lean: () => chainExec(overrides.prescription ?? null),
    })),
    updateOne: jest.fn(
      (_filter: Record<string, unknown>, _update: Record<string, unknown>) =>
        chainExec({ modifiedCount: 1 }),
    ),
    countDocuments: jest.fn(() => chainExec(0)),
    findOne: jest.fn(() => ({
      sort: () => ({
        select: () => ({ lean: () => chainExec(null) }),
      }),
    })),
  };

  const recordModel: any = {
    findById: jest.fn(() => ({
      lean: () => chainExec(overrides.record ?? null),
    })),
    countDocuments: jest.fn(() => chainExec(0)),
  };

  const consents = {
    hasGrantedScope: jest.fn((_userId: string, _scope: string) =>
      Promise.resolve(overrides.hasConsent ?? true),
    ),
  };

  const audit = {
    record: jest.fn((_entry: Record<string, unknown>) => Promise.resolve({})),
  };

  const service = new PrescriptionsService(
    model,
    recordModel,
    consents as any,
    audit as any,
  );

  return { service, model, recordModel, consents, audit, create };
}

const ownedRecord = {
  _id: RECORD_ID,
  userId: 'u1',
  doctorId: 'd1',
};

describe('PrescriptionsService', () => {
  it('declares a unique recordId index (one per record version)', () => {
    const indexes = PrescriptionSchema.indexes() as Array<
      [Record<string, number>, { unique?: boolean }]
    >;
    expect(
      indexes.some(([keys, options]) => keys.recordId === 1 && options?.unique),
    ).toBe(true);
  });

  it('400 for a non-ObjectId recordId', async () => {
    const { service } = buildService();
    await expect(
      service.create('d1', { recordId: 'nope', items }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 when the parent medical record does not exist', async () => {
    const { service } = buildService({ record: null });
    await expect(
      service.create('d1', { recordId: RECORD_ID, items }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 when the doctor does not own the parent record', async () => {
    const { service, consents, create } = buildService({
      record: ownedRecord,
    });

    await expect(
      service.create('d2', { recordId: RECORD_ID, items }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(consents.hasGrantedScope).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('403 when there is no active treatment consent', async () => {
    const { service, create } = buildService({
      record: ownedRecord,
      hasConsent: false,
    });

    await expect(
      service.create('d1', { recordId: RECORD_ID, items }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(create).not.toHaveBeenCalled();
  });

  it('issues the prescription from the E-03 record and audits ids only', async () => {
    const { service, create, consents, audit } = buildService({
      record: ownedRecord,
    });

    const result = await service.create('d1', { recordId: RECORD_ID, items });

    expect(result).toEqual({ success: true, id: P_ID });
    expect(consents.hasGrantedScope).toHaveBeenCalledWith('u1', 'treatment');

    const payload = create.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        recordId: RECORD_ID,
        userId: 'u1',
        doctorId: 'd1',
        items,
        revokedAt: null,
      }),
    );
    expect(payload.issuedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'prescription.issued',
        meta: { recordId: RECORD_ID },
      }),
    );
    expect(JSON.stringify(audit.record.mock.calls[0][0])).not.toContain(
      'amoxicillin',
    );
  });

  it('409 on a duplicate recordId', async () => {
    const { service } = buildService({
      record: ownedRecord,
      createError: Object.assign(new Error('duplicate key'), { code: 11000 }),
    });

    await expect(
      service.create('d1', { recordId: RECORD_ID, items }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('patient lists own prescriptions including revoked ones with status', async () => {
    const revokedAt = new Date('2026-01-01T00:00:00.000Z');
    const prescriptions = [
      {
        _id: 'p1',
        recordId: 'r1',
        userId: 'u1',
        doctorId: 'd1',
        items,
        issuedAt: new Date('2026-01-01'),
        revokedAt: null,
      },
      {
        _id: 'p2',
        recordId: 'r2',
        userId: 'u1',
        doctorId: 'd1',
        items,
        issuedAt: new Date('2026-01-02'),
        revokedAt,
      },
    ];

    const { service } = buildService({ prescriptions });
    const result = await service.listMine('u1', {});

    expect(result.count).toBe(2);
    expect(result.prescriptions[0]).toMatchObject({ status: 'active' });
    expect(result.prescriptions[1]).toMatchObject({
      status: 'revoked',
      revokedAt,
    });
  });

  it('patient reads own prescription but not another patient prescription', async () => {
    const prescription = {
      _id: P_ID,
      recordId: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      items,
      issuedAt: new Date(),
      revokedAt: null,
    };
    const { service } = buildService({ prescription });

    await expect(service.getForPatient('u2', P_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getForPatient('u1', P_ID)).resolves.toMatchObject({
      _id: P_ID,
      status: 'active',
    });
  });

  it('doctor reads own issued prescription but not another doctor prescription', async () => {
    const prescription = {
      _id: P_ID,
      recordId: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      items,
      issuedAt: new Date(),
      revokedAt: null,
    };
    const { service } = buildService({ prescription });

    await expect(service.getForDoctor('d2', P_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getForDoctor('d1', P_ID)).resolves.toMatchObject({
      _id: P_ID,
      status: 'active',
    });
  });

  it('400 for an invalid prescription id', async () => {
    const { service } = buildService();
    await expect(service.getForPatient('u1', 'nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('revoke sets revokedAt and audits the doctor', async () => {
    const prescription = {
      _id: P_ID,
      recordId: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      items,
      issuedAt: new Date(),
      revokedAt: null,
    };
    const { service, model, audit } = buildService({ prescription });

    const result = await service.revoke('d1', P_ID);

    expect(result.success).toBe(true);
    expect(result.alreadyRevoked).toBe(false);
    expect(result.revokedAt).toBeInstanceOf(Date);
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: P_ID, revokedAt: null },
      { $set: { revokedAt: expect.any(Date) } },
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'prescription.revoked',
        meta: { recordId: RECORD_ID },
      }),
    );
  });

  it('revoke is idempotent and preserves the first revokedAt', async () => {
    const revokedAt = new Date('2026-01-01T00:00:00.000Z');
    const prescription = {
      _id: P_ID,
      recordId: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      items,
      issuedAt: new Date(),
      revokedAt,
    };
    const { service, model } = buildService({ prescription });

    const result = await service.revoke('d1', P_ID);

    expect(result.alreadyRevoked).toBe(true);
    expect(result.revokedAt).toEqual(revokedAt);
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('revoke returns the concurrent revoked state without auditing twice', async () => {
    const revokedAt = new Date('2026-01-01T00:00:00.000Z');
    const active = {
      _id: P_ID,
      recordId: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      items,
      issuedAt: new Date(),
      revokedAt: null,
    };
    const alreadyRevoked = { ...active, revokedAt };
    const { service, model, audit } = buildService({ prescription: active });

    model.findById = jest
      .fn()
      .mockReturnValueOnce({ lean: () => chainExec(active) })
      .mockReturnValueOnce({ lean: () => chainExec(alreadyRevoked) });
    model.updateOne = jest.fn(() => chainExec({ modifiedCount: 0 }));

    const result = await service.revoke('d1', P_ID);

    expect(result.alreadyRevoked).toBe(true);
    expect(result.revokedAt).toEqual(revokedAt);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('403 when another doctor tries to revoke', async () => {
    const prescription = {
      _id: P_ID,
      recordId: RECORD_ID,
      userId: 'u1',
      doctorId: 'd1',
      items,
      issuedAt: new Date(),
      revokedAt: null,
    };
    const { service, model } = buildService({ prescription });

    await expect(service.revoke('d2', P_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('status returns metadata only, never items or drug names', async () => {
    const { service, model, recordModel } = buildService();

    model.countDocuments = jest
      .fn()
      .mockReturnValueOnce(chainExec(4))
      .mockReturnValueOnce(chainExec(1));
    recordModel.countDocuments = jest.fn(() => chainExec(6));

    const status = await service.getStatus();

    expect(status).toEqual({
      total: 4,
      active: 3,
      revoked: 1,
      latestIssuedAt: null,
      pending: 2,
    });
    expect(JSON.stringify(status)).not.toContain('items');
    expect(JSON.stringify(status)).not.toContain('amoxicillin');
  });
});
