import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { Appointment } from 'src/appointments/schemas/appointment.schema';
import { Doctor } from 'src/doctors/schemas/doctor.schema';
import { User } from 'src/users/schemas/user.schema';
import { ReportsService } from 'src/reports/reports.service';
import { AuditService } from 'src/audit/audit.service';
import { WaitlistService } from 'src/waitlist/waitlist.service';
import { AvailabilityService } from 'src/availability/availability.service';

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
        // ↓↓↓ ADD ↓↓↓
        {
          provide: AvailabilityService,
          useValue: {
            claimSlot: jest.fn(),
            releaseSlot: jest.fn(),
            getBookedSlots: jest.fn().mockResolvedValue([]),
          },
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

describe('AppointmentsService.verifyPayment', () => {
  const baseAppointment = {
    _id: 'a1',
    userId: 'u1',
    cancelled: false,
    payment: false,
  };

  function makeService(appointment: unknown, payment: unknown) {
    const appointmentModel = {
      findById: jest.fn().mockResolvedValue(appointment),
    };
    const payments = {
      getStatusForAppointment: jest.fn().mockResolvedValue(payment),
    };
    const service = new AppointmentsService(
      appointmentModel as any,
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      payments as any,
    );
    return { service, appointmentModel, payments };
  }

  it('paid Payment wins over a false Appointment mirror', async () => {
    const { service } = makeService({ ...baseAppointment }, { status: 'paid' });

    await expect(service.verifyPayment('u1', 'a1')).resolves.toEqual({
      success: true,
      message: 'Payment verified successfully',
    });
  });

  it('refunded Payment wins over a true Appointment mirror', async () => {
    const { service } = makeService(
      { ...baseAppointment, payment: true },
      { status: 'refunded' },
    );

    await expect(service.verifyPayment('u1', 'a1')).resolves.toEqual({
      success: false,
      message: 'Payment was refunded',
    });
  });

  it('falls back to the mirror when Payment is missing', async () => {
    const { service } = makeService(
      { ...baseAppointment, payment: true },
      null,
    );

    await expect(service.verifyPayment('u1', 'a1')).resolves.toEqual({
      success: true,
      message: 'Payment verified successfully',
    });
  });
});
