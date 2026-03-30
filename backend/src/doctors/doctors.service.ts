import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDoctorDto } from './dto/login-doctor.dto';
import * as bcrypt from 'bcrypt';
import { Appointment, AppointmentDocument } from 'src/appointments/schemas/appointment.schema';

@Injectable()
export class DoctorsService {
    constructor(
        @InjectModel(Doctor.name)
        private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(Appointment.name)
        private readonly appointmentModel: Model<AppointmentDocument>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async getAllDoctors() {
        const doctors = await this.doctorModel.find({}).select('-password');
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

        return { success: true, message: 'Availability changed' };
    }

    async doctorList() {

        try {

            const doctors = await this.doctorModel.find({}).select(['-password', '-email'])
            return { success: true, doctors };

        } catch (error) {

            console.log(error);
            return { success: false, message: error.message };

        }
    }

    async loginDoctor(dto: LoginDoctorDto): Promise<{ success: boolean; token: string }> {
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

        await this.appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });

        return { success: true, message: 'Appointment Completed' };
    }

    async cancelAppointmentDoctor(
        docId: string,
        appointmentId: string,
    ): Promise<{ success: boolean; message: string }> {
        const appointment = await this.appointmentModel.findById(appointmentId);

        if (!appointment || appointment.docId !== docId) {
            throw new UnauthorizedException('Cancellation failed');
        }

        if (appointment.cancelled) {
            throw new BadRequestException('Appointment is already cancelled');
        }

        await this.appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        const doctor = await this.doctorModel.findById(docId);
        if (doctor) {
            const slotsBooked = doctor.slots_booked ?? {};
            const { slotDate, slotTime } = appointment;

            if (slotsBooked[slotDate]) {
                slotsBooked[slotDate] = slotsBooked[slotDate].filter(
                    (slot) => slot !== slotTime,
                );
            }

            await this.doctorModel.findByIdAndUpdate(docId, { slots_booked: slotsBooked });
        }

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

        const patients = [...new Set(appointments.map((item) => item.userId))].length;

        const latestAppointments = [...appointments].reverse().slice(0, 5);

        const dashData = {
            earnings,
            appointments: appointments.length,
            patients,
            latestAppointments,
        };

        return { success: true, dashData };
    }
}
