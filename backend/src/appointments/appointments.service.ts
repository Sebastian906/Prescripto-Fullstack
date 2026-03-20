import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { BookAppointmentDto } from './dto/book-appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
}
