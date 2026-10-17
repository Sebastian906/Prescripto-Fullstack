import { slotDateTime } from 'src/shared/utils/slot-generator.util';

// Check minimo del parser usado para `scheduledAt` del evento 'booked'.
describe('slotDateTime', () => {
  it('combina slotDate legacy "D/M/YYYY" + hora 12h PM', () => {
    const d = slotDateTime('5/11/2026', '02:30 PM');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10); // noviembre
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('acepta el formato normalizado "D_M_YYYY" y mediodia/medianoche', () => {
    expect(slotDateTime('5_11_2026', '12:00 PM').getHours()).toBe(12);
    expect(slotDateTime('5_11_2026', '12:00 AM').getHours()).toBe(0);
  });

  it('interpreta 24h si slotTime no trae AM/PM', () => {
    const d = slotDateTime('07/07/2025', '10:00');
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(7);
    expect(d.getHours()).toBe(10);
  });
});
