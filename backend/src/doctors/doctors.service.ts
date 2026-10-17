import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDoctorDto } from './dto/login-doctor.dto';
import * as bcrypt from 'bcrypt';
import {
  Appointment,
  AppointmentDocument,
} from 'src/appointments/schemas/appointment.schema';
import { UpdateDoctorProfileDto } from './dto/update-profile-doctor.dto';
import { ReportsService } from 'src/reports/reports.service';
import { AuditService } from 'src/audit/audit.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { CacheService } from 'src/shared/cache/cache.service';
import * as outboxPort from 'src/shared/ports/outbox.port';
import { NotificationsFanout } from 'src/notifications/notifications.fanout';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
    private readonly availabilityService: AvailabilityService,
    // @Optional: los specs construyen el service sin CacheService.
    @Optional() private readonly cacheService?: CacheService,
    // @Optional: los specs construyen el service sin outbox ni fan-out.
    @Optional() @Inject(outboxPort.OUTBOX) private readonly outbox?: outboxPort.Outbox,
    @Optional()
    private readonly notificationsFanout?: NotificationsFanout,
  ) {}

  async getAllDoctors() {
    const doctors = await this.doctorModel
      .find({})
      .select('-password -slots_booked');
    return { success: true, doctors };
  }

  async changeAvailability(docId: string) {
    const doctor = await this.doctorModel.findById(docId);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    await this.doctorModel.findByIdAndUpdate(docId, {
      available: !doctor.available,
    });

    this.invalidateDoctorsList();
    return { success: true, message: 'Availability changed' };
  }

  async doctorList() {
    try {
      const doctors = await this.doctorModel
        .find({})
        .select(['-password', '-email', '-slots_booked']);
      return { success: true, doctors };
    } catch (error: any) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async loginDoctor(
    dto: LoginDoctorDto,
  ): Promise<{ success: boolean; token: string }> {
    const { email, password } = dto;

    const doctor = await this.doctorModel.findOne({ email });

    if (!doctor) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, doctor.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign(
      { id: doctor._id },
      { secret: this.configService.get<string>('JWT_SECRET') },
    );

    return { success: true, token };
  }

  async getDoctorAppointments(
    docId: string,
  ): Promise<{ success: boolean; appointments: AppointmentDocument[] }> {
    const appointments = await this.appointmentModel.find({ docId });
    return { success: true, appointments };
  }

  async completeAppointment(
    docId: string,
    appointmentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment || appointment.docId !== docId) {
      throw new UnauthorizedException('Mark failed');
    }

    if (appointment.isCompleted) {
      throw new BadRequestException('Appointment is already completed');
    }

    await this.appointmentModel.findByIdAndUpdate(appointmentId, {
      isCompleted: true,
    });

    const appt = await this.appointmentModel.findById(appointmentId).lean();
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    // Productor del outbox: este metodo NO corre en transaccion, asi que la
    // fila 'completed' es best-effort y NO atomica (session undefined).
    // ponytail: envolver en withTransaction si el worker (Fase 4) exige
    // atomicidad estricta para 'completed'.
    const completedPayload: outboxPort.CompletedPayload = {
      appointmentId: String(appt._id),
      patientId: appt.userId,
      doctorId: docId,
      completedAt: new Date(),
    };
    try {
      await this.outbox?.append('completed', completedPayload, undefined);
    } catch (e) {
      console.log('outbox append failed:', e);
    }

    await this.reportsService.onAppointmentCompleted(
      docId,
      appt.userId,
      appt.amount,
      new Date(appt.date),
    );

    try {
      await this.auditService?.record({
        actorId: docId,
        role: 'doctor',
        action: 'appointment.complete',
        entityId: appointmentId,
        at: new Date(),
      });
    } catch (e) {
      console.log('audit record failed:', e);
    }

    // Entrega best-effort: nunca rompe el "marcar completada".
    await this.notificationsFanout?.dispatchSafe(
      'completed',
      completedPayload,
      String(appt.userData?.email ?? ''),
    );

    return { success: true, message: 'Appointment Completed' };
  }

  async cancelAppointmentDoctor(
    docId: string,
    appointmentId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment || appointment.docId !== docId) {
      throw new UnauthorizedException('Cancellation failed');
    }

    if (appointment.cancelled) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    await this.appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
      cancellationReason: reason ?? '',
    });

    // slots_booked is read-only: release only via Availability ($pull atómico).
    await this.availabilityService.releaseSlot(
      docId,
      appointment.slotDate,
      appointment.slotTime,
    );

    await this.reportsService.onAppointmentCancelled(
      appointment.docId,
      new Date(appointment.date),
    );

    // Productor del outbox: este metodo NO corre en transaccion → best-effort.
    // El payload lleva SOLO IDs + timestamp; el motivo (texto libre) queda en el
    // documento, NUNCA aqui (assertSafeOutboxPayload lo rechazaria).
    const cancelledPayload: outboxPort.CancelledPayload = {
      appointmentId: String(appointment._id),
      patientId: appointment.userId,
      doctorId: appointment.docId,
      cancelledAt: new Date(),
    };
    try {
      await this.outbox?.append('cancelled', cancelledPayload, undefined);
    } catch (e) {
      console.log('outbox append failed:', e);
    }

    try {
      await this.auditService?.record({
        actorId: docId,
        role: 'doctor',
        action: 'appointment.cancel',
        entityId: appointmentId,
        at: new Date(),
      });
    } catch (e) {
      console.log('audit record failed:', e);
    }

    // Entrega best-effort: nunca rompe el cancel.
    await this.notificationsFanout?.dispatchSafe(
      'cancelled',
      cancelledPayload,
      String(appointment.userData?.email ?? ''),
    );

    return { success: true, message: 'Appointment Cancelled' };
  }

  async getDoctorDashboard(docId: string): Promise<{
    success: boolean;
    dashData: {
      earnings: number;
      appointments: number;
      patients: number;
      latestAppointments: AppointmentDocument[];
    };
  }> {
    const appointments = await this.appointmentModel.find({ docId });

    const earnings = appointments.reduce((sum, item) => {
      return item.isCompleted || item.payment ? sum + item.amount : sum;
    }, 0);

    const patients = [...new Set(appointments.map((item) => item.userId))]
      .length;

    const latestAppointments = [...appointments].reverse().slice(0, 5);

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients,
      latestAppointments,
    };

    return { success: true, dashData };
  }

  async getDoctorProfile(
    docId: string,
  ): Promise<{ success: boolean; profileData: DoctorDocument }> {
    const profileData = await this.doctorModel
      .findById(docId)
      .select('-password -slots_booked');

    if (!profileData) {
      throw new NotFoundException('Doctor not found');
    }

    return { success: true, profileData };
  }

  async updateDoctorProfile(
    docId: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<{ success: boolean; message: string }> {
    const { fees, address, available } = dto;

    await this.doctorModel.findByIdAndUpdate(docId, {
      fees: Number(fees),
      address: typeof address === 'string' ? JSON.parse(address) : address,
      available,
    });

    this.invalidateDoctorsList();
    return { success: true, message: 'Profile Updated' };
  }

  // El listado público se cachea 60s; cualquier mutación lo invalida al instante.
  private invalidateDoctorsList(): void {
    this.cacheService?.invalidatePrefix('doctors:list');
  }
}
