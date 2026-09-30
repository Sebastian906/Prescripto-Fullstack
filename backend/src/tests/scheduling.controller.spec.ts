import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingController } from 'src/scheduling/scheduling.controller';
import { SchedulingService } from 'src/scheduling/scheduling.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';

describe('SchedulingController', () => {
  let controller: SchedulingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [{ provide: SchedulingService, useValue: {} }],
    })
      .overrideGuard(AuthUserGuard) // Evita JwtService/ConfigService
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<SchedulingController>(SchedulingController);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
