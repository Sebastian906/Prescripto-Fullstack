import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { MonthlyStats } from './schemas/monthly-stats.schema';
import { MonthlyStatsPatient } from './schemas/monthly-stats-patient.schema';
import { AppliedStatsEvent } from './schemas/applied-stats-event.schema';
import { CacheService } from 'src/shared/cache/cache.service';

type Bucket = {
  totalAppointments: number;
  uniquePatients: number;
  uniquePatientIds: string[];
};

// Harness fiel al contrato atómico: writes staging + rollback si la tx falla.
function buildCluster() {
  const applied = new Set<string>();
  const buckets = new Map<string, Bucket>();
  let staging: Array<() => void> = [];
  let stagedKeys = new Set<string>();
  let failNextCommit = false;
  const keyOf = (f: { docId: string; year: number; month: number }) =>
    `${f.docId}|${f.year}|${f.month}`;
  const dup = () => {
    const e = new Error('E11000 duplicate key') as Error & { code: number };
    e.code = 11000;
    return e;
  };

  const appliedModel = {
    create: jest.fn((docs: Array<{ key: string }>) => {
      const key = docs[0].key;
      if (applied.has(key) || stagedKeys.has(key)) return Promise.reject(dup());
      stagedKeys.add(key);
      staging.push(() => applied.add(key));
      return Promise.resolve(docs);
    }),
  };

  const statsModel = {
    findOne: jest.fn((f: { docId: string; year: number; month: number }) => {
      const lean = () => {
        const b = buckets.get(keyOf(f));
        return Promise.resolve(
          b ? { uniquePatientIds: [...b.uniquePatientIds] } : null,
        );
      };
      const q = { lean, session: () => ({ lean }) };
      return { select: () => q };
    }),
    updateOne: jest.fn((f: Record<string, any>, u: Record<string, any>) => {
      const k = keyOf(f as { docId: string; year: number; month: number });
      staging.push(() => {
        let b = buckets.get(k);
        if (!b) {
          b = { totalAppointments: 0, uniquePatients: 0, uniquePatientIds: [] };
          buckets.set(k, b);
        }
        for (const [kk, vv] of Object.entries(u.$inc ?? {})) {
          (b as Record<string, any>)[kk] =
            ((b as Record<string, any>)[kk] ?? 0) + (vv as number);
        }
        const add = u.$addToSet?.uniquePatientIds as string | undefined;
        if (add && !b.uniquePatientIds.includes(add))
          b.uniquePatientIds.push(add);
      });
      return Promise.resolve({
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        acknowledged: true,
      });
    }),
  };

  const spillModel = {
    exists: jest.fn(() => ({ exec: () => Promise.resolve(null) })),
    create: jest.fn((d: unknown) => {
      staging.push(() => {});
      return Promise.resolve(d);
    }),
    deleteOne: jest.fn(() => ({
      exec: () => Promise.resolve({ deletedCount: 0 }),
    })),
    countDocuments: jest.fn(() => ({ exec: () => Promise.resolve(0) })),
  };

  const appointment = {
    _id: 'x',
    docId: 'doc1',
    date: new Date(2026, 0, 15).getTime(),
  };

  const session = {
    withTransaction: async (cb: () => Promise<void>) => {
      staging = [];
      stagedKeys = new Set();
      await cb();
      if (failNextCommit) {
        failNextCommit = false;
        staging = [];
        stagedKeys = new Set();
        throw new Error('simulated crash before commit');
      }
      staging.forEach((fn) => fn());
      staging = [];
      stagedKeys = new Set();
    },
    endSession: async () => {},
  };

  const connection = {
    startSession: () => Promise.resolve(session),
    collection: () => ({ findOne: () => Promise.resolve(appointment) }),
  };

  return {
    appliedModel,
    statsModel,
    spillModel,
    connection,
    count: () => buckets.get('doc1|2026|1')?.totalAppointments ?? 0,
    failNextCommitOnce: () => {
      failNextCommit = true;
    },
  };
}

describe('ReportsService idempotencia de stats por appointmentId', () => {
  const APPT = '507f1f77bcf86cd799439011';
  const date = new Date(2026, 0, 15);

  async function build() {
    const c = buildCluster();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(MonthlyStats.name), useValue: c.statsModel },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: c.spillModel,
        },
        {
          provide: getModelToken(AppliedStatsEvent.name),
          useValue: c.appliedModel,
        },
        { provide: getConnectionToken(), useValue: c.connection },
        { provide: CacheService, useValue: { invalidatePrefix: jest.fn() } },
      ],
    }).compile();
    return { service: module.get<ReportsService>(ReportsService), c };
  }

  it('doble entrega del evento booked incrementa una sola vez', async () => {
    const { service, c } = await build();
    const first = await service.applyBookedStatsIdempotent(
      APPT,
      'doc1',
      'u1',
      100,
      date,
    );
    const second = await service.applyBookedStatsIdempotent(
      APPT,
      'doc1',
      'u1',
      100,
      date,
    );
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(c.count()).toBe(1);
  });

  it('kill-after-booking converge en el retry sin doble incremento', async () => {
    const { service, c } = await build();
    c.failNextCommitOnce();
    await expect(
      service.applyBookedStatsIdempotent(APPT, 'doc1', 'u1', 100, date),
    ).rejects.toThrow();
    expect(c.count()).toBe(0); // crash antes del commit: nada aplicado
    const retry = await service.applyBookedStatsIdempotent(
      APPT,
      'doc1',
      'u1',
      100,
      date,
    );
    expect(retry.applied).toBe(true);
    expect(c.count()).toBe(1); // converge, no 2
  });

  it('decrementStatsForAppointment es la compensación idempotente', async () => {
    const { service, c } = await build();
    await service.applyBookedStatsIdempotent(APPT, 'doc1', 'u1', 100, date);
    expect(c.count()).toBe(1);
    const dec = await service.decrementStatsForAppointment(APPT);
    expect(dec.applied).toBe(true);
    expect(c.count()).toBe(0);
    const dec2 = await service.decrementStatsForAppointment(APPT);
    expect(dec2.applied).toBe(false);
    expect(c.count()).toBe(0);
  });
});
