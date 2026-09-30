import {
  DomainInvariantError,
  assertAcyclic,
  assertNoOrphans,
  isAcyclic,
  isValidSlotDate,
} from 'src/shared/structures/domain-types';

describe('isValidSlotDate', () => {
  it('acepta 01/01/2026', () => {
    expect(isValidSlotDate('01/01/2026')).toBe(true);
  });
  it('rechaza 32/13/2026', () => {
    expect(isValidSlotDate('32/13/2026')).toBe(false);
  });
  it('acepta bisiesto 29/02/2024', () => {
    expect(isValidSlotDate('29/02/2024')).toBe(true);
  });
  it('rechaza no bisiesto 29/02/2025', () => {
    expect(isValidSlotDate('29/02/2025')).toBe(false);
  });
  it('rechaza día cero 00/01/2026', () => {
    expect(isValidSlotDate('00/01/2026')).toBe(false);
  });
  it('rechaza formato laxo 15/7/2025 (exige DD/MM/YYYY)', () => {
    expect(isValidSlotDate('15/7/2025')).toBe(false);
  });
  it('rechaza no-string', () => {
    expect(isValidSlotDate(123)).toBe(false);
    expect(isValidSlotDate(null)).toBe(false);
  });
});

describe('assertAcyclic', () => {
  it('lanza CYCLE_DETECTED en ciclo directo parentId === id', () => {
    try {
      assertAcyclic([{ id: 'a', parentId: 'a' }]);
      fail('debió lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainInvariantError);
      expect((e as DomainInvariantError).code).toBe('CYCLE_DETECTED');
    }
  });
  it('lanza en ciclo indirecto a→b→a', () => {
    expect(() =>
      assertAcyclic([
        { id: 'a', parentId: 'b' },
        { id: 'b', parentId: 'a' },
      ]),
    ).toThrow(DomainInvariantError);
  });
  it('no lanza en cadena válida', () => {
    expect(() =>
      assertAcyclic([
        { id: 'root', parentId: null },
        { id: 'child', parentId: 'root' },
      ]),
    ).not.toThrow();
  });
});

describe('isAcyclic', () => {
  it('false con ciclo, true sin ciclo', () => {
    expect(isAcyclic([{ id: 'a', parentId: 'a' }])).toBe(false);
    expect(isAcyclic([{ id: 'a', parentId: null }])).toBe(true);
  });
});

describe('assertNoOrphans', () => {
  it('lanza ORPHAN_NODE con parent inexistente', () => {
    try {
      assertNoOrphans([{ id: 'child', parentId: 'missing' }]);
      fail('debió lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainInvariantError);
      expect((e as DomainInvariantError).code).toBe('ORPHAN_NODE');
    }
  });
  it('no lanza cuando todo padre existe o es null', () => {
    expect(() =>
      assertNoOrphans([
        { id: 'root', parentId: null },
        { id: 'child', parentId: 'root' },
      ]),
    ).not.toThrow();
  });
});
