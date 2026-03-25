import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ConfigService } from '@nestjs/config';
import { PaymentCODDto } from './dto/payment-cod.dto';
import { PaymentStripeDto } from './dto/payment-stripe.dto';
import Stripe from 'stripe';

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly configService: ConfigService,
    ) {}

    async bookAppointment(
        userId: string,
        dto: BookAppointmentDto,
    ): Promise<{ success: boolean; message: string; }> {
        const { docId, slotDate, slotTime } = dto;

        const doctor = await this.doctorModel
            .findById(docId)
            .select('-password')
            .lean();
        
        if (!doctor) {
            throw new NotFoundException('Doctor not found');
        }

        if (!doctor.available) {
            throw new NotFoundException('Doctor is not available');
        }

        const slotsBooked: Record<string, string[]> = doctor.slots_booked ?? {};

        if (slotsBooked[slotDate]?.includes(slotTime)) {
            throw new BadRequestException('Slot not available');
        }

        if (slotsBooked[slotDate]) {
            slotsBooked[slotDate].push(slotTime);
        } else {
            slotsBooked[slotDate] = [slotTime];
        }

        const user = await this.userModel
            .findById(userId)
            .select('-password')
            .lean();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { slots_booked: _, ...docDataSnapshot } = doctor;

        const newAppointment = new this.appointmentModel({
            userId,
            docId,
            slotDate,
            slotTime,
            userData: user,
            docData: docDataSnapshot,
            amount: doctor.fees,
            date: Date.now(),
        });

        await newAppointment.save();
        await this.doctorModel.findByIdAndUpdate(docId, {
            slots_booked: slotsBooked,
        });

        return { success: true, message: 'Appointment booked successfully' };
    }

    async getUserAppointments(userId: string): Promise<{ success: boolean; appointments: AppointmentDocument[] }> {
        const appointments = await this.appointmentModel.find({ userId });
        return { success: true, appointments };
    }

    async cancelAppointment(
        userId: string,
        dto: CancelAppointmentDto,
    ): Promise<{ success: boolean; message: string }> {
        const { appointmentId } = dto;

        const appointment = await this.appointmentModel.findById(appointmentId);

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.userId !== userId) {
            throw new UnauthorizedException('Unauthorized action');
        }

        if (appointment.cancelled) {
            throw new BadRequestException('Appointment is already cancelled');
        }

        await this.appointmentModel.findByIdAndUpdate(appointmentId, {
            cancelled: true,
        });

        const { docId, slotDate, slotTime } = appointment;

        const doctor = await this.doctorModel.findById(docId);

        if (doctor) {
            const slotsBooked = doctor.slots_booked ?? {};

            if (slotsBooked[slotDate]) {
                slotsBooked[slotDate] = slotsBooked[slotDate].filter(
                    (slot) => slot !== slotTime,
                );
            }

            await this.doctorModel.findByIdAndUpdate(docId, {
                slots_booked: slotsBooked,
            });
        }

        return { success: true, message: 'Appointment cancelled successfully' };
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

        const stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!);

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
        const stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!);
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch {
            throw new BadRequestException('Invalid Stripe webhook signature');
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
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
