import { Test, TestingModule } from '@nestjs/testing';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { PrescriptionsController } from '../prescriptions/prescriptions.controller';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';

const P_ID = '64f1a2b3c4d5e6f7a8b9c0d1';

function guardsOf(name: keyof PrescriptionsController) {
  const descriptor = Object.getOwnPropertyDescriptor(
    PrescriptionsController.prototype,
    name,
  );
  const handler = descriptor?.value as object | undefined;
  if (!handler) return [];
  return (Reflect.getMetadata('__guards__', handler) as unknown[]) ?? [];
}

describe('PrescriptionsController', () => {
  let controller: PrescriptionsController;

  const service = {
    create: jest.fn().mockResolvedValue({ success: true, id: P_ID }),
    listMine: jest
      .fn()
      .mockResolvedValue({ success: true, count: 0, prescriptions: [] }),
    listForDoctor: jest
      .fn()
      .mockResolvedValue({ success: true, count: 0, prescriptions: [] }),
    getForPatient: jest.fn().mockResolvedValue({ _id: P_ID }),
    getForDoctor: jest.fn().mockResolvedValue({ _id: P_ID }),
    revoke: jest.fn().mockResolvedValue({ success: true, id: P_ID }),
    getStatus: jest.fn().mockResolvedValue({ total: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrescriptionsController],
      providers: [{ provide: PrescriptionsService, useValue: service }],
    })
      .overrideGuard(AuthDoctorGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthUserGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PrescriptionsController>(PrescriptionsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('wires doctor guard on issue and revoke', () => {
    expect(guardsOf('create')).toContain(AuthDoctorGuard);
    expect(guardsOf('revoke')).toContain(AuthDoctorGuard);
  });

  it('wires patient guard on patient list and read', () => {
    expect(guardsOf('mine')).toContain(AuthUserGuard);
    expect(guardsOf('getForPatient')).toContain(AuthUserGuard);
  });

  it('wires admin guard on status', () => {
    expect(guardsOf('status')).toContain(AuthAdminGuard);
  });

  it('issue delegates with dtoken identity', async () => {
    await controller.create({ docId: 'd1' } as any, {
      recordId: P_ID,
      items: [],
    });
    expect(service.create).toHaveBeenCalledWith('d1', expect.any(Object));
  });

  it('patient listing delegates with token identity', async () => {
    await controller.mine({ userId: 'u1' } as any, {});
    expect(service.listMine).toHaveBeenCalledWith('u1', {});
  });

  it('revoke delegates with dtoken identity', async () => {
    await controller.revoke({ docId: 'd1' } as any, P_ID);
    expect(service.revoke).toHaveBeenCalledWith('d1', P_ID);
  });
});
