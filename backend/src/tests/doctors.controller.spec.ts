import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsController } from '../doctors/doctors.controller';
import { DoctorsService } from '../doctors/doctors.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AuthAdminGuard } from '../shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from '../shared/guards/auth-doctor.guard';

describe('DoctorsController', () => {
  let controller: DoctorsController;
  const rating = { avgScore: 4.5, reviewCount: 2 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorsController],
      providers: [
        {
          provide: DoctorsService,
          useValue: {
            doctorList: jest
              .fn()
              .mockResolvedValue({ success: true, doctors: [] }),
          },
        },
        {
          provide: ReviewsService,
          useValue: { getDoctorRating: jest.fn().mockResolvedValue(rating) },
        },
      ],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthDoctorGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DoctorsController>(DoctorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getDoctorsList delega en el servicio', async () => {
    await expect(controller.getDoctorsList()).resolves.toEqual({
      success: true,
      doctors: [],
    });
  });

  it('getDoctorRating returns only the public aggregate', async () => {
    await expect(controller.getDoctorRating('d1')).resolves.toEqual(rating);
  });
});
