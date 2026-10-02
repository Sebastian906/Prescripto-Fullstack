import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SpecialitiesService } from 'src/specialities/specialities.service';
import { Speciality } from 'src/specialities/schemas/speciality.schema';

interface LeanRow {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

const row = (id: string, parentId: string | null): LeanRow => ({
  _id: id,
  name: `Name ${id}`,
  slug: id,
  parentId,
});

// find().select().lean() → lista completa; findById(id).select().lean() →
// fila suelta (para la caminata de profundidad); create /
// findByIdAndUpdate resuelven sin efecto.
const compileWithModel = async (list: LeanRow[]) => {
  const byId: Record<string, { parentId: string | null }> = {};
  for (const d of list) byId[d._id] = { parentId: d.parentId };
  const modelMock = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: () => Promise.resolve(list) }),
    }),
    findById: jest.fn((id: string) => ({
      select: jest.fn().mockReturnValue({
        lean: () => Promise.resolve(byId[id] ?? null),
      }),
    })),
    create: jest.fn((dto: unknown) => Promise.resolve(dto)),
    findByIdAndUpdate: jest.fn(() => Promise.resolve(null)),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SpecialitiesService,
      { provide: getModelToken(Speciality.name), useValue: modelMock },
    ],
  }).compile();
  const svc = module.get<SpecialitiesService>(SpecialitiesService);
  return { svc, modelMock };
};

describe('SpecialitiesService', () => {
  let service: SpecialitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialitiesService,
        { provide: getModelToken(Speciality.name), useValue: {} },
      ],
    }).compile();

    service = module.get<SpecialitiesService>(SpecialitiesService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('SpecialitiesService.getSpecialityTree domain guards', () => {
  const created: SpecialitiesService[] = [];

  afterEach(() => {
    for (const svc of created.splice(0)) svc.onModuleDestroy();
  });

  it('traduce ciclo a 400 CYCLE_DETECTED nombrando nodos', async () => {
    const { svc } = await compileWithModel([row('a', 'a')]);
    created.push(svc);
    try {
      await svc.getSpecialityTree();
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as {
        code?: string;
        message?: string;
      };
      expect(res).toMatchObject({ code: 'CYCLE_DETECTED' });
      expect(res.message).toContain('a');
    }
  });

  it('devuelve huérfanos con 200 en vez de 400', async () => {
    const { svc } = await compileWithModel([
      row('root', null),
      row('orphan', 'missing'),
    ]);
    created.push(svc);
    const res = await svc.getSpecialityTree();
    expect(res.success).toBe(true);
    expect(res.tree).toHaveLength(1);
    expect(res.orphans).toHaveLength(1);
    expect(res.orphans[0].id).toBe('orphan');
    expect(res.orphanCount).toBe(1);
  });

  it('re-lanza error no-dominio sin traducir', async () => {
    const modelMock = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: () => Promise.reject(new Error('db down')),
        }),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialitiesService,
        { provide: getModelToken(Speciality.name), useValue: modelMock },
      ],
    }).compile();
    const svc = module.get<SpecialitiesService>(SpecialitiesService);
    created.push(svc);
    await expect(svc.getSpecialityTree()).rejects.toThrow('db down');
  });

  it('create con padre inexistente → 400 ORPHAN_NODE', async () => {
    const { svc, modelMock } = await compileWithModel([]);
    created.push(svc);
    try {
      await svc.createSpeciality({ name: 'X', slug: 'x', parentId: 'ghost' });
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'ORPHAN_NODE' });
    }
    expect(modelMock.create).not.toHaveBeenCalled();
  });

  it('create superando profundidad 4 → 400 DEPTH_EXCEEDED', async () => {
    const { svc, modelMock } = await compileWithModel([
      row('root', null),
      row('l1', 'root'),
      row('l2', 'l1'),
      row('l3', 'l2'),
      row('l4', 'l3'),
    ]);
    created.push(svc);
    try {
      await svc.createSpeciality({ name: 'X', slug: 'x', parentId: 'l4' });
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'DEPTH_EXCEEDED' });
    }
    expect(modelMock.create).not.toHaveBeenCalled();
  });

  it('update autociclo (parentId === id) → 400 CYCLE_DETECTED', async () => {
    const { svc, modelMock } = await compileWithModel([row('root', null)]);
    created.push(svc);
    try {
      await svc.updateSpeciality('root', { parentId: 'root' });
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'CYCLE_DETECTED' });
    }
    expect(modelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('update bajo su descendiente → 400 CYCLE_DETECTED', async () => {
    const { svc } = await compileWithModel([
      row('root', null),
      row('child', 'root'),
    ]);
    created.push(svc);
    try {
      await svc.updateSpeciality('root', { parentId: 'child' });
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'CYCLE_DETECTED' });
    }
  });

  it('update que desborda por descendientes → 400 DEPTH_EXCEEDED', async () => {
    const { svc, modelMock } = await compileWithModel([
      row('root', null),
      row('a1', 'root'),
      row('a2', 'a1'),
      row('a3', 'a2'),
      row('b1', 'root'),
      row('b2', 'b1'),
      row('b3', 'b2'),
    ]);
    created.push(svc);
    // a1 queda en profundidad 4 (ok) pero a2 llegaría a 5.
    try {
      await svc.updateSpeciality('a1', { parentId: 'b3' });
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'DEPTH_EXCEEDED' });
    }
    expect(modelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
