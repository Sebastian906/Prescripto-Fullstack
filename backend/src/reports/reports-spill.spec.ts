import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportsService, GLOBAL_DOC_ID } from './reports.service';
import { MonthlyStats } from './schemas/monthly-stats.schema';
import { MonthlyStatsPatient } from './schemas/monthly-stats-patient.schema';

function makeStatsModel(state: {
  inline: string[] | null;
  uniquePatients: number;
  updateCalls: Array<{ filter: unknown; update: unknown }>;
}) {
  return {
    findOne: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue(
            state.inline === null
              ? null
              : { uniquePatientIds: [...state.inline] },
          ),
      }),
    })),
    updateOne: jest
      .fn()
      .mockImplementation((filter: unknown, update: unknown) => {
        state.updateCalls.push({ filter, update });
        return Promise.resolve({
          modifiedCount: 1,
          matchedCount: 1,
          acknowledged: true,
        });
      }),
  };
}

describe('ReportsService spill (cap 5000)', () => {
  async function build(state: {
    inline: string[] | null;
    uniquePatients: number;
    spill: Set<string>;
  }) {
    const updateCalls: Array<{ filter: unknown; update: unknown }> = [];
    const statsModel = makeStatsModel({
      inline: state.inline,
      uniquePatients: state.uniquePatients,
      updateCalls,
    });
    const spillModel = {
      exists: jest.fn().mockImplementation((q: { patientId: string }) => ({
        exec: () =>
          Promise.resolve(state.spill.has(q.patientId) ? { _id: 'x' } : null),
      })),
      create: jest.fn().mockImplementation((d: { patientId: string }) => {
        if (state.spill.has(d.patientId)) {
          const e = new Error('duplicate key') as Error & { code: number };
          e.code = 11000;
          return Promise.reject(e);
        }
        state.spill.add(d.patientId);
        return Promise.resolve(d);
      }),
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: () => Promise.resolve(state.spill.size),
      })),
      deleteOne: jest.fn().mockImplementation(() => ({
        exec: () => Promise.resolve({ deletedCount: 0 }),
      })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(MonthlyStats.name), useValue: statsModel },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: spillModel,
        },
      ],
    }).compile();
    return {
      service: module.get<ReportsService>(ReportsService),
      statsModel,
      spillModel,
      updateCalls,
    };
  }

  it('paciente nuevo con hueco inline usa $addToSet + $inc uniquePatients', async () => {
    const { service, statsModel, spillModel } = await build({
      inline: ['p1'],
      uniquePatients: 1,
      spill: new Set(),
    });
    await service.onAppointmentBooked('doc1', 'p2', 100, new Date(2025, 4, 10));
    expect(spillModel.create).not.toHaveBeenCalled();
    const incUpdate = statsModel.updateOne.mock.calls.find(
      ([, u]) => (u as { $addToSet?: unknown }).$addToSet,
    );
    expect(incUpdate).toBeDefined();
    expect(JSON.stringify(incUpdate?.[1])).toContain('uniquePatients');
  });

  it('paciente duplicado inline no toca spill ni incrementa uniquePatients', async () => {
    const { service, spillModel, statsModel } = await build({
      inline: ['p1'],
      uniquePatients: 1,
      spill: new Set(),
    });
    await service.onAppointmentBooked('doc1', 'p1', 100, new Date(2025, 4, 10));
    expect(spillModel.create).not.toHaveBeenCalled();
    const withAddToSet = statsModel.updateOne.mock.calls.filter(
      ([, u]) => (u as { $addToSet?: unknown }).$addToSet,
    );
    expect(withAddToSet.length).toBe(0);
  });

  it('paciente ya en spill solo incrementa contadores', async () => {
    const { service, spillModel, statsModel } = await build({
      inline: new Array(5000).fill(0).map((_, i) => `p${i}`),
      uniquePatients: 5001,
      spill: new Set(['px']),
    });
    await service.onAppointmentBooked('doc1', 'px', 100, new Date(2025, 4, 10));
    // create no debe llamarse de nuevo para px
    expect(
      spillModel.create.mock.calls.filter(([d]) => d.patientId === 'px').length,
    ).toBe(0);
    expect(statsModel.updateOne).toHaveBeenCalled();
  });

  it('inline lleno hace spill y mantiene exactitud', async () => {
    const inline = new Array(5000).fill(0).map((_, i) => `p${i}`);
    const { service, spillModel } = await build({
      inline,
      uniquePatients: 5000,
      spill: new Set(),
    });
    await service.onAppointmentBooked(
      'doc1',
      'nuevo-1',
      100,
      new Date(2025, 4, 10),
    );
    expect(spillModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'nuevo-1' }),
    );
  });

  it('duplicado concurrente en spill (E11000) no duplica uniquePatients', async () => {
    const inline = new Array(5000).fill(0).map((_, i) => `p${i}`);
    const { service, spillModel, statsModel } = await build({
      inline,
      uniquePatients: 5001,
      spill: new Set(['race']),
    });
    // exists mockeado como null para forzar carrera create→E11000
    spillModel.exists.mockImplementationOnce(() => ({
      exec: () => Promise.resolve(null),
    }));
    await service.onAppointmentBooked(
      'doc1',
      'race',
      100,
      new Date(2025, 4, 10),
    );
    expect(spillModel.create).toHaveBeenCalled();
    const incUnique = statsModel.updateOne.mock.calls.filter(([, u]) =>
      JSON.stringify(u).includes('uniquePatients'),
    );
    // Solo el path de catch (contadores) o ninguno con uniquePatients duplicado extra;
    // lo importante: no lanza y no hace $addToSet inline.
    const withAdd = statsModel.updateOne.mock.calls.filter(
      ([, u]) => (u as { $addToSet?: unknown }).$addToSet,
    );
    expect(withAdd.length).toBe(0);
    expect(incUnique.length).toBeLessThanOrEqual(1);
  });

  it('6000 pacientes vía servicio: 5000 inline, 1000 en spill, uniquePatients 6000', async () => {
    const MAX = 5000;
    type Bucket = {
      created: boolean;
      inline: string[];
      uniquePatients: number;
    };
    const buckets = new Map<string, Bucket>();
    const spills = new Map<string, Set<string>>();
    const keyOf = (f: { docId: string; year: number; month: number }) =>
      `${f.docId}|${f.year}|${f.month}`;
    const bucketOf = (k: string): Bucket => {
      let b = buckets.get(k);
      if (!b) {
        b = { created: false, inline: [], uniquePatients: 0 };
        buckets.set(k, b);
      }
      return b;
    };
    const spillOf = (k: string): Set<string> => {
      let s = spills.get(k);
      if (!s) {
        s = new Set<string>();
        spills.set(k, s);
      }
      return s;
    };
    const dupError = () => {
      const e = new Error('duplicate key') as Error & { code: number };
      e.code = 11000;
      return e;
    };

    const statsModel = {
      findOne: jest.fn().mockImplementation((filter: unknown) => {
        const f = filter as { docId: string; year: number; month: number };
        const b = bucketOf(keyOf(f));
        return {
          select: jest.fn().mockReturnValue({
            lean: jest
              .fn()
              .mockResolvedValue(
                b.created ? { uniquePatientIds: [...b.inline] } : null,
              ),
          }),
          slice: jest.fn().mockReturnThis(),
        };
      }),
      updateOne: jest
        .fn()
        .mockImplementation(
          (filter: unknown, update: unknown, opts?: { upsert?: boolean }) => {
            const f = filter as {
              docId: string;
              year: number;
              month: number;
              uniquePatientIds?: { $ne?: string };
              [k: string]: unknown;
            };
            const b = bucketOf(keyOf(f));
            const u = update as {
              $inc?: Record<string, number>;
              $addToSet?: Record<string, string>;
            };
            const nePid =
              typeof f.uniquePatientIds === 'object'
                ? f.uniquePatientIds.$ne
                : undefined;
            // Filtro $ne incumplido sobre doc existente: sin match (con
            // upsert, Mongo intentaría insertar y chocaría con el índice
            // único → 11000, como en producción).
            if (nePid !== undefined && b.created && b.inline.includes(nePid)) {
              if (opts?.upsert) return Promise.reject(dupError());
              return Promise.resolve({
                modifiedCount: 0,
                matchedCount: 1,
                acknowledged: true,
              });
            }
            // Filtro de cap atómico: índice 4999 existente = lleno.
            const capKey = `uniquePatientIds.${MAX - 1}`;
            if (
              (f[capKey] as { $exists?: boolean } | undefined)?.$exists ===
                false &&
              b.created &&
              b.inline.length >= MAX
            ) {
              return Promise.resolve({
                modifiedCount: 0,
                matchedCount: 1,
                acknowledged: true,
              });
            }
            if (!b.created && !opts?.upsert) {
              return Promise.resolve({
                modifiedCount: 0,
                matchedCount: 0,
                acknowledged: true,
              });
            }
            b.created = true;
            if (u.$addToSet?.uniquePatientIds) {
              const pid = u.$addToSet.uniquePatientIds;
              if (!b.inline.includes(pid) && b.inline.length < MAX)
                b.inline.push(pid);
            }
            if (u.$inc?.uniquePatients)
              b.uniquePatients += u.$inc.uniquePatients;
            return Promise.resolve({
              modifiedCount: 1,
              matchedCount: 1,
              acknowledged: true,
            });
          },
        ),
    };
    const spillModel = {
      exists: jest
        .fn()
        .mockImplementation(
          (q: {
            docId: string;
            year: number;
            month: number;
            patientId: string;
          }) => ({
            exec: () =>
              Promise.resolve(
                spillOf(keyOf(q)).has(q.patientId) ? { _id: 'x' } : null,
              ),
          }),
        ),
      create: jest
        .fn()
        .mockImplementation(
          (d: {
            docId: string;
            year: number;
            month: number;
            patientId: string;
          }) => {
            const s = spillOf(keyOf(d));
            if (s.has(d.patientId)) return Promise.reject(dupError());
            s.add(d.patientId);
            return Promise.resolve(d);
          },
        ),
      deleteOne: jest.fn().mockImplementation(() => ({
        exec: () => Promise.resolve({ deletedCount: 0 }),
      })),
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: () => Promise.resolve(0),
      })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(MonthlyStats.name), useValue: statsModel },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: spillModel,
        },
      ],
    }).compile();
    const service = module.get<ReportsService>(ReportsService);

    const date = new Date(2025, 5, 15);
    for (let i = 0; i < 6000; i++) {
      await service.onAppointmentBooked('doc6000', `s${i}`, 10, date);
    }

    const docKey = 'doc6000|2025|6';
    const globalKey = `${GLOBAL_DOC_ID}|2025|6`;
    for (const k of [docKey, globalKey]) {
      expect(buckets.get(k)?.inline.length).toBe(5000);
      expect(buckets.get(k)?.uniquePatients).toBe(6000);
    }
    const spilled = [...spills.values()].reduce((n, s) => n + s.size, 0);
    expect(spilled).toBe(2000); // 1000 del doctor + 1000 globales
  });

  it('onAppointmentCompleted/Cancelled no tocan arrays de pacientes', async () => {
    const { service, statsModel, spillModel } = await build({
      inline: null,
      uniquePatients: 0,
      spill: new Set(),
    });
    // findOne devuelve null → path upsert solo si hay patientId; aquí no hay.
    await service.onAppointmentCompleted(
      'doc1',
      'u1',
      50,
      new Date(2025, 0, 5),
    );
    await service.onAppointmentCancelled('doc1', new Date(2025, 0, 5));
    expect(spillModel.create).not.toHaveBeenCalled();
    expect(statsModel.updateOne).toHaveBeenCalled();
  });

  it('GLOBAL_DOC_ID se actualiza junto al doctor', async () => {
    const { service, statsModel } = await build({
      inline: ['a'],
      uniquePatients: 1,
      spill: new Set(),
    });
    await service.onAppointmentBooked('docX', 'b', 10, new Date(2025, 6, 1));
    // 2 llamadas a incrementStats → al menos 2 updateOne/findOne
    expect(statsModel.updateOne.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(GLOBAL_DOC_ID).toBe('__global__');
  });

  it.each([['p1'], ['p2'], ['p3']])(
    'idempotencia: repetir %s no crece el conteo (inline)',
    async (pid) => {
      const { service, statsModel } = await build({
        inline: [pid],
        uniquePatients: 1,
        spill: new Set(),
      });
      await service.onAppointmentBooked('d', pid, 10, new Date(2025, 6, 1));
      await service.onAppointmentBooked('d', pid, 10, new Date(2025, 6, 1));
      const withAdd = statsModel.updateOne.mock.calls.filter(
        ([, u]) => (u as { $addToSet?: unknown }).$addToSet,
      );
      expect(withAdd.length).toBe(0);
    },
  );

  it('ids vacíos no rompen el flujo', async () => {
    const { service } = await build({
      inline: [],
      uniquePatients: 0,
      spill: new Set(),
    });
    await expect(
      service.onAppointmentBooked('d', '', 10, new Date(2025, 6, 1)),
    ).resolves.toBeUndefined();
  });

  it('mes/año se extraen correctamente (junio=6)', async () => {
    const { service, statsModel } = await build({
      inline: [],
      uniquePatients: 0,
      spill: new Set(),
    });
    await service.onAppointmentBooked('d', 'z', 10, new Date(2025, 5, 15));
    const filters = statsModel.updateOne.mock.calls.map(
      ([f]) => f as Record<string, unknown>,
    );
    expect(filters[0]).toMatchObject({ month: 6, year: 2025 });
  });

  it('paginación de pacientes solo trae la ventana pedida (getUniquePatientIds)', async () => {
    const inline = new Array(100).fill(0).map((_, i) => `q${i}`);
    const aggregate = jest
      .fn()
      .mockResolvedValue([{ inlineCount: 100, uniquePatients: 100 }]);
    const slicedIds = jest.fn((...args: unknown[]) => args);
    const statsModelMock = {
      aggregate,
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          slice: jest.fn().mockImplementation((...a: unknown[]) => {
            slicedIds(...a);
            const [start, size] = a[1] as [number, number];
            return {
              lean: jest.fn().mockResolvedValue({
                uniquePatientIds: inline.slice(start, start + size),
              }),
            };
          }),
        }),
      }),
    };
    const spillFindChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    const mod = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(MonthlyStats.name),
          useValue: statsModelMock,
        },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: {
            countDocuments: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(0),
            }),
            find: jest.fn().mockReturnValue(spillFindChain),
          },
        },
      ],
    }).compile();
    const svc = mod.get<ReportsService>(ReportsService);
    const r = await svc.getUniquePatientIds('d', 2025, 6, 1, 50);
    expect(r.ids.length).toBe(50);
    expect(r.total).toBe(100);
    // Ventana pedida vía $slice, sin traer los 100 inline.
    expect(slicedIds).toHaveBeenCalledWith('uniquePatientIds', [0, 50]);
  });
});
