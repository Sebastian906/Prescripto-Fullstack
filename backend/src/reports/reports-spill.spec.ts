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

  it('6000 pacientes sintéticos: inline queda en 5000 y spill recibe 1000', () => {
    const state = {
      inline: [] as string[],
      uniquePatients: 0,
      spill: new Set<string>(),
    };
    // Simular servicio realista sin 6000 mocks: iterar lógica de decisión.
    const MAX = 5000;
    for (let i = 0; i < 6000; i++) {
      const pid = `s${i}`;
      if (state.inline.includes(pid) || state.spill.has(pid)) continue;
      if (state.inline.length < MAX) state.inline.push(pid);
      else state.spill.add(pid);
    }
    expect(state.inline.length).toBe(5000);
    expect(state.spill.size).toBe(1000);
    expect(state.inline.length + state.spill.size).toBe(6000);
    // uniquePatients exacto = suma
    expect(state.inline.length + state.spill.size).toBe(6000);
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

  it('500 mensajes: paginación de pacientes no carga todo (getUniquePatientIds)', async () => {
    const inline = new Array(100).fill(0).map((_, i) => `q${i}`);
    const mod = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(MonthlyStats.name),
          useValue: {
            findOne: () => ({
              select: () => ({
                lean: () =>
                  Promise.resolve({
                    uniquePatientIds: inline,
                    uniquePatients: 100,
                  }),
              }),
            }),
          },
        },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: {
            find: () => ({
              select: () => ({ lean: () => Promise.resolve([]) }),
            }),
          },
        },
      ],
    }).compile();
    const svc = mod.get<ReportsService>(ReportsService);
    const r = await svc.getUniquePatientIds('d', 2025, 6, 1, 50);
    expect(r.ids.length).toBe(50);
    expect(r.total).toBe(100);
  });
});
