import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { MonthlyStats } from './schemas/monthly-stats.schema';
import { MonthlyStatsPatient } from './schemas/monthly-stats-patient.schema';
import { AppliedStatsEvent } from './schemas/applied-stats-event.schema';
import { CacheService } from 'src/shared/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { Appointment } from 'src/appointments/schemas/appointment.schema';
import { BookAppointmentDto } from 'src/appointments/dto/book-appointment.dto';
import { Doctor } from 'src/doctors/schemas/doctor.schema';
import { User } from 'src/users/schemas/user.schema';
import { AuditService } from 'src/audit/audit.service';
import { WaitlistService } from 'src/waitlist/waitlist.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { NotificationsFanout } from 'src/notifications/notifications.fanout';
import { OUTBOX } from 'src/shared/ports/outbox.port';

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
    const e = new Error(
      'E11000 duplicate key error collection: prescripto.applied_stats_events index: key_1 dup key',
    ) as Error & { code: number; keyPattern: Record<string, number> };
    e.code = 11000;
    e.keyPattern = { key: 1 };
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
    findOne: jest.fn((f: { key: string }) => {
      const lean = () =>
        Promise.resolve(applied.has(f.key) ? { _id: f.key } : null);
      return { session: () => ({ select: () => ({ lean }) }) };
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

  it('decrement sin forward booked no aplica (applied false)', async () => {
    const { service, c } = await build();
    const dec = await service.decrementStatsForAppointment(APPT);
    expect(dec.applied).toBe(false);
    expect(c.count()).toBe(0);
  });
});

describe('AppointmentsService.bookAppointment × stats (Saga boundary)', () => {
  const APPT = '507f1f77bcf86cd799439011';

  async function buildBooking(stats: {
    applyBookedStatsIdempotent: jest.Mock;
  }) {
    const created = { _id: APPT, date: new Date(2026, 0, 15).getTime() };
    const appointmentModel = {
      create: jest.fn().mockResolvedValue([created]),
    };
    const doctorModel = {
      findById: jest.fn(() => ({
        select: () => ({
          session: () => ({
            lean: () =>
              Promise.resolve({
                _id: 'doc1',
                available: true,
                fees: 100,
                name: 'Dr',
              }),
          }),
        }),
      })),
    };
    const userModel = {
      findById: jest.fn(() => ({
        select: () => ({
          session: () => ({
            lean: () => Promise.resolve({ _id: 'u1', email: 'u@example.com' }),
          }),
        }),
      })),
    };
    const outbox = { append: jest.fn().mockResolvedValue(undefined) };
    const availabilityService = {
      getBookedSlots: jest.fn().mockResolvedValue([]),
      claimSlot: jest.fn().mockResolvedValue({ claimed: true }),
    };
    const bookingSession = {
      withTransaction: async (cb: () => Promise<void>) => {
        await cb();
      },
      endSession: async () => {},
    };
    const connection = { startSession: () => Promise.resolve(bookingSession) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getModelToken(Appointment.name),
          useValue: appointmentModel,
        },
        { provide: getModelToken(Doctor.name), useValue: doctorModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getConnectionToken(), useValue: connection },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: ReportsService, useValue: stats },
        { provide: AuditService, useValue: {} },
        { provide: WaitlistService, useValue: {} },
        { provide: AvailabilityService, useValue: availabilityService },
        { provide: OUTBOX, useValue: outbox },
        { provide: NotificationsFanout, useValue: { dispatchSafe: jest.fn() } },
      ],
    }).compile();

    return {
      service: module.get<AppointmentsService>(AppointmentsService),
      outbox,
    };
  }

  it('commitea reserva + outbox aunque stats falle y preserva el appointmentId', async () => {
    const apply = jest
      .fn()
      .mockRejectedValueOnce(new Error('stats db down'))
      .mockResolvedValue({ applied: false });
    const { service, outbox } = await buildBooking({
      applyBookedStatsIdempotent: apply,
    });
    const dto: BookAppointmentDto = {
      docId: 'doc1',
      slotDate: '20_7_2025',
      slotTime: '10:00 am',
    };

    const res = await service.bookAppointment('u1', dto);

    expect(res.success).toBe(true);
    expect(outbox.append).toHaveBeenCalledWith(
      'booked',
      expect.objectContaining({ appointmentId: APPT }),
      expect.anything(),
    );
    // best-effort: el fallo de stats no tumba la reserva ya commiteada, y el
    // retry recibe la misma idempotency key (convergencia cubierta por el test
    // directo de doble entrega/chaos).
    expect(apply).toHaveBeenCalledWith(
      APPT,
      'doc1',
      'u1',
      100,
      expect.any(Date),
    );
  });
});
