import { Test, TestingModule } from '@nestjs/testing';
import { SpecialitiesController } from './specialities.controller';
import { SpecialitiesService } from './specialities.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';

describe('SpecialitiesController', () => {
  let controller: SpecialitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialitiesController],
      providers: [
        {
          provide: SpecialitiesService,
          useValue: {
            getSpecialityTree: jest.fn(),
            getSpecialityNames: jest.fn(),
            resolveSpecialitySlugs: jest.fn(),
            createSpeciality: jest.fn(),
            updateSpeciality: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SpecialitiesController>(SpecialitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
