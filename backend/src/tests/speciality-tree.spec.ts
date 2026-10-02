import { performance } from 'perf_hooks';
import {
  DomainInvariantError,
  MAX_SPECIALITY_DEPTH,
  SpecialityCycleError,
  SpecialityDepthError,
} from 'src/shared/structures/domain-types';
import { buildSpecialityTree } from 'src/shared/structures/speciality-tree';

const node = (id: string, parentId: string | null) => ({
  id,
  name: `Node ${id}`,
  slug: id,
  parentId,
});

describe('buildSpecialityTree', () => {
  it('lanza SpecialityCycleError nombrando los nodos en a→b→a', () => {
    try {
      buildSpecialityTree([node('a', 'b'), node('b', 'a')]);
      fail('debió lanzar ciclo');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainInvariantError);
      expect(e).toBeInstanceOf(SpecialityCycleError);
      expect((e as DomainInvariantError).code).toBe('CYCLE_DETECTED');
      expect((e as Error).message).toContain('a -> b -> a');
    }
  });

  it('lanza ciclo en autociclo parentId === id', () => {
    try {
      buildSpecialityTree([node('a', 'a')]);
      fail('debió lanzar ciclo');
    } catch (e) {
      expect(e).toBeInstanceOf(SpecialityCycleError);
      expect((e as Error).message).toContain('a');
    }
  });

  it('devuelve huérfanos junto a las raíces sin perderlos', () => {
    const { roots, orphans, orphanCount } = buildSpecialityTree([
      node('root', null),
      node('child', 'root'),
      node('orphan', 'missing'),
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].children).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe('orphan');
    expect(orphans[0].parentId).toBe('missing');
    expect(orphanCount).toBe(1);
  });

  it(`acepta profundidad ${MAX_SPECIALITY_DEPTH} y rechaza la que excede`, () => {
    const ok = [
      node('root', null),
      node('l1', 'root'),
      node('l2', 'l1'),
      node('l3', 'l2'),
      node('l4', 'l3'),
    ];
    expect(() => buildSpecialityTree(ok)).not.toThrow();
    try {
      buildSpecialityTree([...ok, node('l5', 'l4')]);
      fail('debió lanzar profundidad');
    } catch (e) {
      expect(e).toBeInstanceOf(SpecialityDepthError);
      expect((e as DomainInvariantError).code).toBe('DEPTH_EXCEEDED');
      expect((e as Error).message).toContain('l5');
    }
  });

  it('construye 1000 nodos en <50ms (estrella y ramificado)', () => {
    // Una cadena lineal de 1000 es ilegal bajo maxDepth=4 por diseño;
    // el perf usa las dos formas de 1000 nodos válidas en profundidad.
    const buildStar = () => {
      const flat = [node('n0', null)];
      for (let i = 1; i < 1000; i++) flat.push(node(`n${i}`, 'n0'));
      return flat;
    };
    const buildBranched = () => {
      const flat = [node('n0', null)];
      for (let i = 1; i <= 9; i++) flat.push(node(`n${i}`, 'n0'));
      for (let i = 10; i <= 99; i++)
        flat.push(node(`n${i}`, `n${1 + Math.floor((i - 10) / 10)}`));
      for (let i = 100; i <= 999; i++)
        flat.push(node(`n${i}`, `n${10 + Math.floor((i - 100) / 10)}`));
      return flat;
    };
    for (let w = 0; w < 3; w++) {
      buildSpecialityTree(buildStar());
      buildSpecialityTree(buildBranched());
    }
    const t0 = performance.now();
    const star = buildSpecialityTree(buildStar());
    const t1 = performance.now();
    const branched = buildSpecialityTree(buildBranched());
    const t2 = performance.now();
    expect(star.roots).toHaveLength(1);
    expect(star.orphanCount).toBe(0);
    expect(branched.orphanCount).toBe(0);
    expect(t1 - t0).toBeLessThan(50);
    expect(t2 - t1).toBeLessThan(50);
  });
});
