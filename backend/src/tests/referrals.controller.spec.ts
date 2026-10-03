import { Test, TestingModule } from '@nestjs/testing';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { ReferralReason } from '../referrals/referrals.constants';
import { ReferralsController } from '../referrals/referrals.controller';
import { ReferralsService } from '../referrals/referrals.service';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  const referralsService = {
    createForDoctor: jest.fn().mockResolvedValue({ success: true, id: 'r1' }),
    createForAdmin: jest.fn().mockResolvedValue({ success: true, id: 'r2' }),
    findReferrers: jest
      .fn()
      .mockResolvedValue({ success: true, depth1: [], depth2: [] }),
    listFrom: jest.fn().mockResolvedValue({ success: true, referrals: [] }),
    listAll: jest.fn().mockResolvedValue({ success: true, referrals: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [{ provide: ReferralsService, useValue: referralsService }],
    })
      .overrideGuard(AuthDoctorGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReferralsController>(ReferralsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('doctor create delegates with dtoken identity', async () => {
    await controller.createMine(
      { docId: 'docA' },
      {
        toDoctorId: 'docB',
        reason: ReferralReason.LabWorkup,
      },
    );
    expect(referralsService.createForDoctor).toHaveBeenCalledWith(
      'docA',
      'docB',
      ReferralReason.LabWorkup,
      undefined,
    );
  });

  it('BFS delegates with default hops=2', async () => {
    await controller.findReferrers('docB', {});
    expect(referralsService.findReferrers).toHaveBeenCalledWith('docB', 2);
  });
});
