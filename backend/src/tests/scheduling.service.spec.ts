import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Appointment } from 'src/appointments/schemas/appointment.schema';
import { Doctor } from 'src/doctors/schemas/doctor.schema';
import { SchedulingService } from 'src/scheduling/scheduling.service';

describe('SchedulingService', () => {
  let service: SchedulingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: getModelToken(Doctor.name), useValue: {} },
        { provide: getModelToken(Appointment.name), useValue: {} },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Boundary 400 en fechas inválidas (no toca DB, lanza antes)
  it('rechaza 32/13/2026 con 400 INVALID_SLOT_DATE', async () => {
    const req = {
      docId: '64f1a2b3c4d5e6f7a8b9c0d1',
      preferredDates: ['32/13/2026'],
      priorityLevel: 'normal' as const,
    };
    try {
      await service.suggestSlots(req);
      fail('debió lanzar BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as {
        code?: string;
      };
      expect(res.code).toBe('INVALID_SLOT_DATE');
    }
  });

  // Formato laxo también es 400 en modo estricto
  it('rechaza 15/7/2025 (laxo) con 400', async () => {
    await expect(
      service.suggestSlots({
        docId: '64f1a2b3c4d5e6f7a8b9c0d1',
        preferredDates: ['15/7/2025'],
        priorityLevel: 'normal' as const,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
