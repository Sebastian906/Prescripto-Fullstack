import { Test, TestingModule } from '@nestjs/testing';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';

describe('MigrationController', () => {
  let controller: MigrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MigrationController],
      providers: [{ provide: MigrationService, useValue: {} }],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MigrationController>(MigrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
