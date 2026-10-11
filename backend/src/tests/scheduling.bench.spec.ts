/**
 * scheduling.bench — Benchmark icebox del trigger beam-search (k=5).

 * Issue: activation condition only. NO implementa beam-search ni toca
 * `src/scheduling/scheduling.service.ts`.

 * Trigger codificado: `p95 suggest > 300ms` sobre la reference seed de abajo
 *   => TRIGGER FIRED (el test falla, exit no-cero): implementar beam-search k=5.
 *   => TRIGGER SLEEPING (el test pasa): el issue sigue dormido.

 * Reference seed (determinista, sin Date.now()/random/fechas laxas):
 *   8 doctores x 7 dias (15/07/2026-21/07/2026) x 22 slots/dia.
 *   Ocupacion: slot i ocupado si (i + doctorIdx + dateIdx) % 3 === 0.
 *   "Multi-doctor search" = fan-out secuencial de 8 x suggestSlots(), porque
 *   SchedulingService.suggestSlots() acepta un solo docId por llamada
 *   (ver scheduling.controller.ts: POST api/scheduling/suggest-slot).

 * Ejecucion (<5min, sin dependencias nuevas, sin servidor, sin DB):
 *   cd backend && pnpm test -- scheduling.bench
 * Forzar disparo (valida el umbral):
 *   P95_THRESHOLD_MS=1 pnpm test -- scheduling.bench   # debe fallar con TRIGGER FIRED

 * REEVALUACION TRIMESTRAL — label `icebox`, no es trabajo programado.
 * Proxima revision: anotar fecha al re-ejecutar cada trimestre.
 */

import { performance } from 'perf_hooks';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Appointment } from 'src/appointments/schemas/appointment.schema';
import { Doctor } from 'src/doctors/schemas/doctor.schema';
import { AvailabilityService } from 'src/availability/availability.service';
import { SchedulingService } from 'src/scheduling/scheduling.service';

// Trigger (unica fuente de verdad del umbral)
function readThreshold(): number {
  const raw = Number(process.env['P95_THRESHOLD_MS'] ?? 300);
  return Number.isFinite(raw) && raw >= 0 ? raw : 300;
}
const P95_THRESHOLD_MS = readThreshold();

// Reference seed
const N_DOCTORS = 8;
const N_DAYS = 7;
const ITERATIONS = 50;
const WARMUP = 5;

const DOC_IDS: string[] = Array.from(
  { length: N_DOCTORS },
  (_, i) => `64f1a2b3c4d5e6f7a8b9c0d${i}`,
);
const DATES: string[] = Array.from(
  { length: N_DAYS },
  (_, i) => `${String(15 + i).padStart(2, '0')}/07/2026`,
);
// generateDaySlots(10:00-21:00, 30m) = 22 slots (copia del golden G01-G30).
const ALL = [
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
];

function buildBookedSeed(): Record<string, Record<string, string[]>> {
  const seed: Record<string, Record<string, string[]>> = {};
  DOC_IDS.forEach((docId, di) => {
    const byDate: Record<string, string[]> = {};
    DATES.forEach((date, dIdx) => {
      byDate[date] = ALL.filter((_s, sIdx) => (sIdx + di + dIdx) % 3 === 0);
    });
    seed[docId] = byDate;
  });
  return seed;
}

async function makeBenchService(
  bookedByDoctor: Record<string, Record<string, string[]>>,
): Promise<SchedulingService> {
  const doctorModel = {
    findById: jest.fn().mockImplementation((id: string) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: id, available: true }),
      }),
    })),
  };
  const availability = {
    getBookedSlots: jest
      .fn()
      .mockImplementation((id: string, d: string) =>
        Promise.resolve(bookedByDoctor[id]?.[d] ?? []),
      ),
  };
  const mod: TestingModule = await Test.createTestingModule({
    providers: [
      SchedulingService,
      { provide: getModelToken(Doctor.name), useValue: doctorModel },
      { provide: getModelToken(Appointment.name), useValue: {} },
      { provide: AvailabilityService, useValue: availability },
    ],
  }).compile();
  return mod.get<SchedulingService>(SchedulingService);
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const clamped = Math.max(0, Math.min(idx, sortedAsc.length - 1));
  return sortedAsc[clamped] ?? 0;
}

describe('scheduling.bench [icebox, reevaluar trimestralmente]', () => {
  it(`p95 suggest multi-doctor (8x7x22) <= ${P95_THRESHOLD_MS}ms o TRIGGER FIRED`, async () => {
    const service = await makeBenchService(buildBookedSeed());

    const oneSearch = async (): Promise<void> => {
      for (const docId of DOC_IDS) {
        await service.suggestSlots({
          docId,
          preferredDates: DATES,
          priorityLevel: 'normal',
        });
      }
    };

    for (let w = 0; w < WARMUP; w++) await oneSearch();

    const latencies: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await oneSearch();
      latencies.push(performance.now() - t0);
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);

    console.log(
      `[bench] n=${ITERATIONS} seed=${N_DOCTORS}x${N_DAYS}x${ALL.length} ` +
        `p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms p99=${p99.toFixed(2)}ms ` +
        `threshold=${P95_THRESHOLD_MS}ms`,
    );

    if (p95 > P95_THRESHOLD_MS) {
      console.error(
        `TRIGGER FIRED: p95 suggest ${p95.toFixed(2)}ms > ${P95_THRESHOLD_MS}ms — implementar beam-search k=5`,
      );
      throw new Error(
        `TRIGGER FIRED: p95 ${p95.toFixed(2)}ms > ${P95_THRESHOLD_MS}ms`,
      );
    }

    console.log(
      'TRIGGER SLEEPING: p95 dentro del umbral, el issue sigue icebox',
    );
    expect(p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  }, 120000);
});
