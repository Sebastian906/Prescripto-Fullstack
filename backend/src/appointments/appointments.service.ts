import { BadRequestException, Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
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
import { binarySearch, getAvailableSlots } from 'src/shared/utils/binary-search.util';
import { generateDaySlots, dateToSlotKey } from 'src/shared/utils/slot-generator.util';

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectConnection() private readonly connection: Connection,
        private readonly configService: ConfigService,
    ) {}

    async bookAppointment(
        userId: string,
        dto: BookAppointmentDto,
    ): Promise<{ success: boolean; message: string }> {
        const { docId, slotDate, slotTime } = dto;

        const session = await this.connection.startSession();

        try {
            let result: { success: boolean; message: string };

            await session.withTransaction(async () => {
                const doctor = await this.doctorModel
                    .findById(docId)
                    .select('-password')
                    .session(session)
                    .lean();

                if (!doctor) throw new NotFoundException('Doctor not found');
                if (!doctor.available) {
                    throw new BadRequestException('Doctor is not available');
                }

                const bookedForDay: string[] = doctor.slots_booked?.[slotDate] ?? [];

                const sortedBooked = [...bookedForDay].sort((a, b) =>
                    a.localeCompare(b),
                );

                const alreadyBooked = binarySearch(sortedBooked, slotTime);
                if (alreadyBooked !== -1) {
                    throw new BadRequestException('Slot not available');
                }

                const user = await this.userModel
                    .findById(userId)
                    .select('-password')
                    .session(session)
                    .lean();

                if (!user) throw new NotFoundException('User not found');

                const slotKey = `slots_booked.${slotDate}`;
                const updateResult = await this.doctorModel
                    .findOneAndUpdate(
                        {
                            _id: docId,
                            [`slots_booked.${slotDate}`]: { $not: { $elemMatch: { $eq: slotTime } } },
                        },
                        { $push: { [slotKey]: slotTime } }, { session, new: true },
                    )
                    .lean();

                if (!updateResult) {
                    throw new BadRequestException('Slot was just taken. Please select another time.');
                }

                const { slots_booked: _, ...docDataSnapshot } = doctor;

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
                    ], { session }, 
                );
                result = { success: true, message: 'Appointment booked successfully' };
            });
            return result!;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) { throw error }
            throw new InternalServerErrorException('Booking failed due to a conflict. Please try again.');
        } finally {
            await session.endSession();
        }
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
        const session = await this.connection.startSession();

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

                await Promise.all([
                    this.appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true }, { session }),
                    this.doctorModel.findByIdAndUpdate(
                        appointment.docId,
                        {
                            $pull: {
                                [`slots_booked.${appointment.slotDate}`]: appointment.slotTime,
                            },
                        },
                        { session },
                    ),
                ]);

                result = {
                    success: true,
                    message: 'Appointment cancelled successfully',
                };
            });

            return result!;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
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
            .select('slots_booked available')
            .lean();

        if (!doctor) throw new NotFoundException('Doctor not found');
        if (!doctor.available) {
            return { success: true, slots: [] };
        }

        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        const allSlots = generateDaySlots(date);

        const bookedRaw: string[] = doctor.slots_booked?.[dateStr] ?? [];
        const bookedSorted = [...bookedRaw].sort((a, b) => a.localeCompare(b));

        const availableSlots = getAvailableSlots(allSlots, bookedSorted);

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
