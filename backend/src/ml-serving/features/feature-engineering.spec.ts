import {
  assertNoFreeText,
  assertNoPhiFields,
  deriveLabel,
  emptyHistory,
  historyFeatures,
  leadTimeDays,
  observe,
  patientKey,
  timeBand,
  weekdayOf,
} from './feature-engineering';
import type { FeatureRow } from '../types';

const row = (over: Partial<FeatureRow> = {}): FeatureRow => ({
  appointmentId: '64f1a2b3c4d5e6f7a8b9c0d1',
  patientKey: patientKey('u1'),
  timeBand: 'morning',
  weekday: 3,
  leadTimeDays: 4,
  priorCount: 1,
  priorCancelRate: 0.5,
  priorNoShowRate: 0,
  label: 1,
  ...over,
});

describe('timeBand', () => {
  it.each([
    [new Date(2026, 0, 5, 0, 0), 'morning'],
    [new Date(2026, 0, 5, 11, 59), 'morning'],
    [new Date(2026, 0, 5, 12, 0), 'afternoon'],
    [new Date(2026, 0, 5, 17, 59), 'afternoon'],
    [new Date(2026, 0, 5, 18, 0), 'evening'],
    [new Date(2026, 0, 5, 21, 59), 'evening'],
    [new Date(2026, 0, 5, 22, 0), 'night'],
  ])('%s -> %s', (date, expected) => {
    expect(timeBand(date)).toBe(expected);
  });
});

describe('weekdayOf / leadTimeDays', () => {
  it('mapea un martes conocido', () => {
    expect(weekdayOf(new Date(2026, 0, 6))).toBe(2);
  });

  it('calcula el lead time y no baja de 0', () => {
    const created = new Date(2026, 0, 1).getTime();
    expect(leadTimeDays(created, new Date(2026, 0, 6))).toBe(5);
    expect(leadTimeDays(created, new Date(2025, 11, 30))).toBe(0);
    expect(leadTimeDays(Number.NaN, new Date(2026, 0, 6))).toBe(0);
  });
});

describe('historyFeatures', () => {
  it('devuelve ceros sin historial', () => {
    expect(historyFeatures(emptyHistory())).toEqual({
      priorCount: 0,
      priorCancelRate: 0,
      priorNoShowRate: 0,
    });
  });

  it('acumula desenlaces', () => {
    const state = emptyHistory();
    observe(state, { cancelled: false, noShow: false });
    observe(state, { cancelled: true, noShow: false });
    observe(state, { cancelled: false, noShow: true });
    expect(historyFeatures(state)).toEqual({
      priorCount: 3,
      priorCancelRate: 1 / 3,
      priorNoShowRate: 1 / 3,
    });
  });
});

describe('deriveLabel', () => {
  const scheduled = new Date(2026, 0, 10, 18, 0);
  const now = new Date(2026, 0, 20).getTime();

  it('cancelada 3h antes -> positiva', () => {
    expect(
      deriveLabel(
        {
          cancelled: true,
          cancelledAt: new Date(2026, 0, 10, 15, 0).getTime(),
          isCompleted: false,
          scheduledAt: scheduled,
        },
        now,
      ),
    ).toBe(1);
  });

  it('cancelada 3 días antes -> negativa', () => {
    expect(
      deriveLabel(
        {
          cancelled: true,
          cancelledAt: new Date(2026, 0, 7, 18, 0).getTime(),
          isCompleted: false,
          scheduledAt: scheduled,
        },
        now,
      ),
    ).toBe(0);
  });

  it('frontera: 24h exactas negativa, 23h positiva', () => {
    const at = (hoursBefore: number): 0 | 1 | null =>
      deriveLabel(
        {
          cancelled: true,
          cancelledAt: scheduled.getTime() - hoursBefore * 3_600_000,
          isCompleted: false,
          scheduledAt: scheduled,
        },
        now,
      );
    expect(at(24)).toBe(0);
    expect(at(23)).toBe(1);
  });

  it('cancelada sin timestamp -> no decidible', () => {
    expect(
      deriveLabel(
        {
          cancelled: true,
          cancelledAt: null,
          isCompleted: false,
          scheduledAt: scheduled,
        },
        now,
      ),
    ).toBeNull();
  });

  it('completada -> negativa', () => {
    expect(
      deriveLabel(
        { cancelled: false, isCompleted: true, scheduledAt: scheduled },
        now,
      ),
    ).toBe(0);
  });

  it('pasada sin completar -> positiva', () => {
    expect(
      deriveLabel(
        { cancelled: false, isCompleted: false, scheduledAt: scheduled },
        now,
      ),
    ).toBe(1);
  });

  it('futura sin completar -> no decidible', () => {
    expect(
      deriveLabel(
        {
          cancelled: false,
          isCompleted: false,
          scheduledAt: new Date(2026, 1, 1),
        },
        now,
      ),
    ).toBeNull();
  });
});

describe('guards PHI', () => {
  it('acepta una fila válida', () => {
    const valid = row() as unknown as Record<string, unknown>;
    expect(() => assertNoPhiFields(valid)).not.toThrow();
    expect(() => assertNoFreeText(valid)).not.toThrow();
  });

  it('rechaza claves fuera de la allowlist', () => {
    expect(() => assertNoPhiFields({ ...row(), email: 'a@b.c' })).toThrow(
      /posible PHI/,
    );
  });

  it('rechaza IDs con forma libre', () => {
    expect(() =>
      assertNoPhiFields({
        ...row(),
        appointmentId: 'Maria Garcia',
      }),
    ).toThrow(/ObjectId/);
  });

  it('rechaza strings largos', () => {
    expect(() => assertNoFreeText({ note: 'a'.repeat(33) })).toThrow(
      /texto libre/,
    );
  });
});
