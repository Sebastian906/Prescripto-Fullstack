import { patientKey } from '../features/feature-engineering';
import { toFeatureRows, type RawAppointment } from './rows';

const NOW = new Date(2026, 0, 20).getTime();
const GRANTED = new Set(['u-late', 'u-early', 'u-future', 'u-done']);

const make = (over: Partial<RawAppointment>): RawAppointment => ({
  _id: '64f1a2b3c4d5e6f7a8b9c0d1',
  userId: 'u-late',
  slotDate: '10/1/2026',
  slotTime: '6:00 PM',
  date: new Date(2026, 0, 5).getTime(),
  cancelled: false,
  cancelledAt: null,
  isCompleted: false,
  isSynthetic: false,
  ...over,
});

describe('toFeatureRows', () => {
  it('etiqueta cancelación tardía como positiva', () => {
    const { rows, dropped } = toFeatureRows(
      [
        make({
          userId: 'u-late',
          cancelled: true,
          cancelledAt: new Date(2026, 0, 10, 15, 0).getTime(),
        }),
      ],
      GRANTED,
      { now: NOW, includeSynthetic: false },
    );
    expect(dropped).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe(1);
    expect(rows[0].patientKey).toBe(patientKey('u-late'));
    expect(rows[0].timeBand).toBe('evening');
    expect(rows[0].leadTimeDays).toBe(5);
  });

  it('etiqueta cancelación temprana como negativa', () => {
    const { rows } = toFeatureRows(
      [
        make({
          userId: 'u-early',
          cancelled: true,
          cancelledAt: new Date(2026, 0, 7, 18, 0).getTime(),
        }),
      ],
      GRANTED,
      { now: NOW, includeSynthetic: false },
    );
    expect(rows[0].label).toBe(0);
  });

  it('descarta citas futuras, sin consentimiento y sintéticas', () => {
    const { rows, dropped } = toFeatureRows(
      [
        make({ userId: 'u-future', slotDate: '1/2/2026' }),
        make({ userId: 'u-sin-consent' }),
        make({ userId: 'u-done', isSynthetic: true, isCompleted: true }),
      ],
      GRANTED,
      { now: NOW, includeSynthetic: false },
    );
    expect(rows).toHaveLength(0);
    expect(dropped).toBe(3);
  });

  it('ordena por slot: el historial no ve desenlaces futuros', () => {
    const { rows } = toFeatureRows(
      [
        // Reservada antes, pero su slot es POSTERIOR a la segunda cita.
        make({
          _id: '64f1a2b3c4d5e6f7a8b9c0e1',
          userId: 'u-done',
          slotDate: '15/1/2026',
          date: new Date(2026, 0, 1).getTime(),
          isCompleted: true,
        }),
        make({
          _id: '64f1a2b3c4d5e6f7a8b9c0e2',
          userId: 'u-done',
          slotDate: '5/1/2026',
          date: new Date(2026, 0, 2).getTime(),
          isCompleted: true,
        }),
      ],
      GRANTED,
      { now: NOW, includeSynthetic: false },
    );

    expect(rows.map((row) => row.appointmentId.slice(-1))).toEqual(['2', '1']);
    expect(rows[0].priorCount).toBe(0);
    expect(rows[1].priorCount).toBe(1);
    expect(rows[1].priorCancelRate).toBe(0);
  });

  it('acumula cancelaciones previas del mismo paciente', () => {
    const { rows } = toFeatureRows(
      [
        make({
          userId: 'u-late',
          slotDate: '5/1/2026',
          cancelled: true,
          cancelledAt: new Date(2026, 0, 5, 12, 0).getTime(),
        }),
        make({
          _id: '64f1a2b3c4d5e6f7a8b9c0d2',
          userId: 'u-late',
          slotDate: '10/1/2026',
          isCompleted: true,
        }),
      ],
      GRANTED,
      { now: NOW, includeSynthetic: false },
    );
    expect(rows[1].priorCount).toBe(1);
    expect(rows[1].priorCancelRate).toBe(1);
  });
});
