import {
  binarySearchSlots,
  compareSlots,
  getAvailableSlotsByMinutes,
  lowerBoundSlots,
  sortSlots,
  toMinutes,
} from 'src/shared/utils/binary-search.util';

describe('toMinutes', () => {
  it('12:00 AM === 0', () => {
    expect(toMinutes('12:00 AM')).toBe(0);
  });

  it('12:00 PM === 720', () => {
    expect(toMinutes('12:00 PM')).toBe(720);
  });

  it('01:00 AM === 60', () => {
    expect(toMinutes('01:00 AM')).toBe(60);
  });

  it('01:00 PM === 780', () => {
    expect(toMinutes('01:00 PM')).toBe(780);
  });

  it('02:00 PM === 840', () => {
    expect(toMinutes('02:00 PM')).toBe(840);
  });

  it('11:59 PM === 1439', () => {
    expect(toMinutes('11:59 PM')).toBe(1439);
  });

  it('soporta 24h sin AM/PM', () => {
    expect(toMinutes('14:00')).toBe(840);
  });

  it('tolera minusculas y espacios extra', () => {
    expect(toMinutes('  2:00  pm ')).toBe(840);
  });

  it('invalidas retornan NaN', () => {
    expect(toMinutes('foo')).toBeNaN();
    expect(toMinutes('25:00')).toBeNaN();
    expect(toMinutes('13:00 PM')).toBeNaN();
  });
});

describe('orden cronologico', () => {
  it('snapshot ["09:30 AM","02:00 PM","10:00 AM"]', () => {
    expect(sortSlots(['09:30 AM', '02:00 PM', '10:00 AM'])).toEqual([
      '09:30 AM',
      '10:00 AM',
      '02:00 PM',
    ]);
  });

  it('binarySearchSlots halla en array cronologico', () => {
    const sorted = sortSlots(['09:30 AM', '02:00 PM', '10:00 AM']);
    expect(binarySearchSlots(sorted, '02:00 PM')).toBe(2);
    expect(binarySearchSlots(sorted, '11:00 AM')).toBe(-1);
  });

  it('lowerBoundSlots primera >= target', () => {
    const sorted = sortSlots(['09:30 AM', '02:00 PM', '10:00 AM']);
    expect(lowerBoundSlots(sorted, '10:00 AM')).toBe(1);
    expect(lowerBoundSlots(sorted, '09:00 PM')).toBe(3);
  });

  it('getAvailableSlotsByMinutes descuenta ocupados', () => {
    const all = ['10:00 AM', '10:30 AM', '02:00 PM'];
    expect(getAvailableSlotsByMinutes(all, sortSlots(['02:00 PM']))).toEqual([
      '10:00 AM',
      '10:30 AM',
    ]);
  });

  it('property: 200 permutaciones con semilla ordenan cronologicamente', () => {
    let seed = 42;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const base = [
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '12:00 PM',
      '02:00 PM',
      '08:30 PM',
    ];
    for (let k = 0; k < 200; k++) {
      const shuffled = [...base].sort(() => rnd() - 0.5);
      const sorted = sortSlots(shuffled);
      for (let i = 1; i < sorted.length; i++) {
        expect(toMinutes(sorted[i - 1])).toBeLessThanOrEqual(
          toMinutes(sorted[i]),
        );
      }
      expect(
        compareSlots(sorted[0], sorted[sorted.length - 1]),
      ).toBeLessThanOrEqual(0);
    }
  });
});
