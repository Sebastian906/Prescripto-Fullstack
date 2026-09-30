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
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
