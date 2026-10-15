import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsController } from '../doctors/doctors.controller';
import { DoctorsService } from '../doctors/doctors.service';
import { AuthAdminGuard } from '../shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from '../shared/guards/auth-doctor.guard';

describe('DoctorsController', () => {
  let controller: DoctorsController;

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
});
