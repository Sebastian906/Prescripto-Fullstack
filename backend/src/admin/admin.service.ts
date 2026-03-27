import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isEmail } from 'class-validator';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';
import { LoginAdminDto } from './dto/login-admin.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DoctorsService } from 'src/doctors/doctors.service';
import { Appointment, AppointmentDocument } from 'src/appointments/schemas/appointment.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly doctorService: DoctorsService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }
    
    async addDoctor(body: any, imageFile: Express.Multer.File) {
        const { name, email, password, speciality, degree, experience, about, fees, address } = body;

        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            throw new BadRequestException('Missing details');
        }

        if (!isEmail(email)) {
            throw new BadRequestException('Please enter a valid email');
        }

        if (password.length < 8) {
            throw new BadRequestException('Please enter a stronger password (min 8 characters)');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const imageUpload = await this.cloudinaryService.uploadImage(imageFile);
        const imageUrl = imageUpload.secure_url;

        const newDoctor = new this.doctorModel({
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees: Number(fees),       
            address: JSON.parse(address),  
        });

        await newDoctor.save();

        return { success: true, message: 'Doctor added successfully' };
    }

    async getAllDoctors() {
        return this.doctorService.getAllDoctors();
    }

    async loginAdmin(body: LoginAdminDto) {
        if (!body) {
            throw new BadRequestException('Request body is missing');
        }

        const { email, password } = body;

        const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
        const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

        if (email !== adminEmail || password !== adminPassword) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwtService.sign(email + password, {
            secret: this.configService.get<string>('JWT_SECRET'),
        });

        return { success: true, token };
    }

    async getAllAppointments(): Promise<{ success: boolean; appointments: AppointmentDocument[] }> {
        const appointments = await this.appointmentModel.find({});
        return { success: true, appointments };
    }

    async cancelAppointment(appointmentId: string): Promise<{ success: boolean; message: string }> {
        const appointment = await this.appointmentModel.findById(appointmentId);

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.cancelled) {
            throw new BadRequestException('Appointment is already cancelled');
        }

        await this.appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        const { docId, slotDate, slotTime } = appointment;
        const doctor = await this.doctorModel.findById(docId);

        if (doctor) {
            const slotsBooked = doctor.slots_booked ?? {};

            if (slotsBooked[slotDate]) {
                slotsBooked[slotDate] = slotsBooked[slotDate].filter(
                    (slot) => slot !== slotTime,
                );
            }

            await this.doctorModel.findByIdAndUpdate(docId, { slots_booked: slotsBooked });
        }

        return { success: true, message: 'Appointment Cancelled' };
    }

    async getDashboard(): Promise<{
        success: boolean;
        dashData: {
            doctors: number;
            appointments: number;
            patients: number;
            latestAppointments: AppointmentDocument[];
        }
    }> {

        const [doctorCount, userCount, appointments] = await Promise.all([
            this.doctorModel.countDocuments(),
            this.userModel.countDocuments(),
            this.appointmentModel.find({}).sort({ date: -1 }).limit(5).lean(),
        ])

        const dashData = {
            doctors: doctorCount,
            appointments: await this.appointmentModel.countDocuments(),
            patients: userCount,
            latestAppointments: appointments,
        }

        return { success: true, dashData };
    }
}
