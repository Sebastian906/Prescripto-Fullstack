import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SpecialitiesService } from 'src/specialities/specialities.service';
import { Speciality } from 'src/specialities/schemas/speciality.schema';

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

  const compileWithLean = async (leanImpl: () => Promise<unknown>) => {
    const modelMock = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: leanImpl }),
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
    return svc;
  };

  it('traduce ciclo a 400 CYCLE_DETECTED', async () => {
    const svc = await compileWithLean(() =>
      Promise.resolve([{ _id: 'a', name: 'A', slug: 'a', parentId: 'a' }]),
    );
    try {
      await svc.getSpecialityTree();
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'CYCLE_DETECTED' });
    }
  });

  it('traduce huérfano a 400 ORPHAN_NODE', async () => {
    const svc = await compileWithLean(() =>
      Promise.resolve([
        { _id: 'child', name: 'Child', slug: 'child', parentId: 'missing' },
      ]),
    );
    try {
      await svc.getSpecialityTree();
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(
        (e as BadRequestException).getResponse() as { code?: string },
      ).toMatchObject({ code: 'ORPHAN_NODE' });
    }
  });

  it('re-lanza error no-dominio sin traducir', async () => {
    const svc = await compileWithLean(() =>
      Promise.reject(new Error('db down')),
    );
    await expect(svc.getSpecialityTree()).rejects.toThrow('db down');
  });
});
