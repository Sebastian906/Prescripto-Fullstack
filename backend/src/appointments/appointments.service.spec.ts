import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './schemas/appointment.schema';
import { Doctor } from 'src/doctors/schemas/doctor.schema';
import { User } from 'src/users/schemas/user.schema';
import { ReportsService } from 'src/reports/reports.service';
import { AuditService } from 'src/audit/audit.service';
import { WaitlistService } from 'src/waitlist/waitlist.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: getModelToken(Appointment.name), useValue: {} },
        { provide: getModelToken(Doctor.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: 'DatabaseConnection', useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: ReportsService, useValue: {} },
        { provide: AuditService, useValue: {} },
        {
          provide: WaitlistService,
          useValue: { promoteEarliest: jest.fn().mockResolvedValue(null) },
        },
      ],
    })
      .overrideProvider('DatabaseConnection')
      .useValue({ startSession: jest.fn() })
      .compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
