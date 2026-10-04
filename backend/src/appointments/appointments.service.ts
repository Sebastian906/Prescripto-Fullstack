import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { Connection, Model } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ConfigService } from '@nestjs/config';
import { PaymentCODDto } from './dto/payment-cod.dto';
import { PaymentStripeDto } from './dto/payment-stripe.dto';
import Stripe from 'stripe';
import {
  binarySearchSlots,
  compareSlots,
  getAvailableSlotsByMinutes,
} from 'src/shared/utils/binary-search.util';
import { generateDaySlots } from 'src/shared/utils/slot-generator.util';
import { ReportsService } from 'src/reports/reports.service';
import { AuditService } from 'src/audit/audit.service';
import { Logger } from '@nestjs/common';
import { WaitlistService } from 'src/waitlist/waitlist.service';
import {
  AvailabilityService,
  MAX_SLOTS_PER_DAY,
} from 'src/availability/availability.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
    private readonly waitlistService: WaitlistService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async bookAppointment(
    userId: string,
    dto: BookAppointmentDto,
  ): Promise<{ success: boolean; message: string }> {
    const { docId, slotDate, slotTime } = dto;

    const session = await this.connection.startSession();

    let bookedFees = 0;

    try {
      let result: { success: boolean; message: string };

      await session.withTransaction(async () => {
        const doctor = await this.doctorModel
          .findById(docId)
          .select('_id available fees')
          .session(session)
          .lean();

        if (!doctor) throw new NotFoundException('Doctor not found');
        if (!doctor.available) {
          throw new BadRequestException('Doctor is not available');
        }

        const bookedForDay = await this.availabilityService.getBookedSlots(
          docId,
          slotDate,
        );
        const sortedBooked = [...bookedForDay].sort(compareSlots);

        const alreadyBooked = binarySearchSlots(sortedBooked, slotTime);
        if (alreadyBooked !== -1) {
          throw new BadRequestException('Slot not available');
        }
        if (sortedBooked.length >= MAX_SLOTS_PER_DAY) {
          throw new HttpException(
            'Day is fully booked',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const user = await this.userModel
          .findById(userId)
          .select('-password')
          .session(session)
          .lean();

        if (!user) throw new NotFoundException('User not found');

        const claim = await this.availabilityService.claimSlot(
          docId,
          slotDate,
          slotTime,
          session,
        );

        if (!claim.claimed) {
          if (claim.reason === 'capped') {
            throw new HttpException(
              'Day is fully booked',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          throw new BadRequestException(
            'Slot was just taken. Please select another time.',
          );
        }

        const { slots_booked: _ignored, ...docDataSnapshot } =
          doctor as unknown as Record<string, unknown>;

        await this.appointmentModel.create(
          [
            {
              userId,
              docId,
              slotDate,
              slotTime,
              userData: user,
              docData: docDataSnapshot,
              amount: doctor.fees,
              date: Date.now(),
            },
          ],
          { session },
        );

        bookedFees = doctor.fees;
        result = { success: true, message: 'Appointment booked successfully' };
      });

      await this.reportsService.onAppointmentBooked(
        docId,
        userId,
        bookedFees,
        new Date(),
      );

      return result!;
    } catch (error) {
      console.error('bookAppointment ERROR:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Booking failed due to a conflict. Please try again.',
      );
    } finally {
      await session.endSession();
    }
  }

  async getUserAppointments(
    userId: string,
  ): Promise<{ success: boolean; appointments: AppointmentDocument[] }> {
    const appointments = await this.appointmentModel.find({ userId });
    return { success: true, appointments };
  }

  async cancelAppointment(
    userId: string,
    dto: CancelAppointmentDto,
  ): Promise<{ success: boolean; message: string }> {
    const { appointmentId } = dto;
    const session = await this.connection.startSession();

    let cancelledDocId = '';
    let cancelledDate = new Date();
    let freedSlotDateKey = '';
    let freedSlotTime = '';
    let promotedWaitlistId = '';
    let promotedUserId = '';

    try {
      let result: { success: boolean; message: string };

      await session.withTransaction(async () => {
        const appointment = await this.appointmentModel
          .findById(appointmentId)
          .session(session);

        if (!appointment) throw new NotFoundException('Appointment not found');
        if (appointment.userId !== userId) {
          throw new UnauthorizedException('Unauthorized action');
        }
        if (appointment.cancelled) {
          throw new BadRequestException('Already cancelled');
        }

        await this.appointmentModel.findByIdAndUpdate(
          appointmentId,
          { cancelled: true },
          { session },
        );
        await this.availabilityService.releaseSlot(
          appointment.docId,
          appointment.slotDate,
          appointment.slotTime,
          session,
        );

        // FIFO promotion: mismo tx. Normaliza claves legacy "D/M/YYYY" a "D_M_YYYY".
        freedSlotDateKey = appointment.slotDate.replace(/\//g, '_');
        freedSlotTime = appointment.slotTime;
        const waiter = await this.waitlistService.promoteEarliest(
          appointment.docId,
          freedSlotDateKey,
          freedSlotTime,
          session,
        );
        if (waiter) {
          const reclaim = await this.availabilityService.claimSlot(
            appointment.docId,
            appointment.slotDate,
            freedSlotTime,
            session,
          );
          if (!reclaim.claimed) {
            this.logger.warn(
              `waitlist promotion lost race doctor=${appointment.docId} date=${freedSlotDateKey} time=${freedSlotTime}`,
            );
          }
          promotedWaitlistId = String(waiter._id);
          promotedUserId = waiter.userId;
        }

        cancelledDocId = appointment.docId;
        cancelledDate = new Date(appointment.date);
        result = {
          success: true,
          message: 'Appointment cancelled successfully',
        };
      });

      await this.reportsService.onAppointmentCancelled(
        cancelledDocId,
        cancelledDate,
      );

      // Promotion log: IDs only, best-effort fuera de la tx (no rompe el cancel).
      if (promotedWaitlistId) {
        this.logger.log(
          JSON.stringify({
            event: 'waitlist.promoted',
            waitlistId: promotedWaitlistId,
            userId: promotedUserId,
            doctorId: cancelledDocId,
            slotDateKey: freedSlotDateKey,
            slotTime: freedSlotTime,
            appointmentId: dto.appointmentId,
          }),
        );
      }

      // Exactly one audit entry per user cancel (best-effort: never breaks the cancel).
      try {
        await this.auditService?.record({
          actorId: userId,
          role: 'user',
          action: 'appointment.cancel',
          entityId: appointmentId,
          at: new Date(),
        });
      } catch (e) {
        console.error('audit record failed:', e);
      }

      return result!;
    } catch (error) {
      console.error('cancelAppointment ERROR:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Cancellation failed. Try again.');
    } finally {
      await session.endSession();
    }
  }

  async getAvailableSlots(
    docId: string,
    dateStr: string,
  ): Promise<{ success: boolean; slots: string[] }> {
    const doctor = await this.doctorModel
      .findById(docId)
      .select('_id available')
      .lean();

    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.available) {
      return { success: true, slots: [] };
    }

    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    const allSlots = generateDaySlots(date);

    const bookedRaw: string[] = await this.availabilityService.getBookedSlots(
      docId,
      dateStr,
    );
    const bookedSorted = [...bookedRaw].sort(compareSlots);

    const availableSlots = getAvailableSlotsByMinutes(allSlots, bookedSorted);

    return { success: true, slots: availableSlots };
  }

  async payWithCOD(
    userId: string,
    dto: PaymentCODDto,
  ): Promise<{ success: boolean; message: string }> {
    const { appointmentId } = dto;

    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.cancelled) {
      throw new BadRequestException('Appointment is cancelled');
    }

    if (appointment.userId !== userId) {
      throw new UnauthorizedException('Unauthorized action');
    }

    if (appointment.payment) {
      throw new BadRequestException('Appointment is already paid');
    }

    await this.appointmentModel.findByIdAndUpdate(appointmentId, {
      payment: true,
    });

    return { success: true, message: 'Payment confirmed (Cash on Delivery)' };
  }

  async payWithStripe(
    userId: string,
    dto: PaymentStripeDto,
  ): Promise<{ success: boolean; sessionId: string; url: string }> {
    const { appointmentId } = dto;

    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.cancelled) {
      throw new BadRequestException('Appointment is cancelled');
    }

    if (appointment.userId !== userId) {
      throw new UnauthorizedException('Unauthorized action');
    }

    if (appointment.payment) {
      throw new BadRequestException('Appointment is already paid');
    }

    const stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
    );

    const currency = this.configService.get<string>('CURRENCY') ?? 'usd';
    const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Appointment with ${appointment.docData['name']}`,
              description: `${appointment.slotDate} at ${appointment.slotTime}`,
            },
            unit_amount: appointment.amount * 100, // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/my-appointments?payment=success&appointmentId=${appointmentId}`,
      cancel_url: `${frontendUrl}/my-appointments?payment=cancelled`,
      metadata: {
        appointmentId,
        userId,
      },
    });

    return { success: true, sessionId: session.id, url: session.url! };
  }

  async verifyStripePayment(
    payload: Buffer,
    signature: string,
  ): Promise<{ received: boolean }> {
    const stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
    );
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    )!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;

      if (appointmentId) {
        await this.appointmentModel.findByIdAndUpdate(appointmentId, {
          payment: true,
        });
      }
    }

    return { received: true };
  }

  async verifyPayment(
    userId: string,
    appointmentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.userId !== userId) {
      throw new UnauthorizedException('Unauthorized action');
    }

    if (appointment.cancelled) {
      throw new BadRequestException('Appointment is cancelled');
    }

    return appointment.payment
      ? { success: true, message: 'Payment verified successfully' }
      : { success: false, message: 'Payment not completed' };
  }
}
