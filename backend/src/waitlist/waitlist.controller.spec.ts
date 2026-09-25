import { Test, TestingModule } from '@nestjs/testing';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

describe('WaitlistController', () => {
  let controller: WaitlistController;
  const waitlistService = {
    join: jest.fn().mockResolvedValue({ success: true }),
    listMine: jest.fn().mockResolvedValue({ success: true, entries: [] }),
    leave: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [{ provide: WaitlistService, useValue: waitlistService }],
    })
      .overrideGuard(AuthUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WaitlistController>(WaitlistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
