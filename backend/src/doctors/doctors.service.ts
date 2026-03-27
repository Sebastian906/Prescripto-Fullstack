import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDoctorDto } from './dto/login-doctor.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
    constructor(
        @InjectModel(Doctor.name)
        private readonly doctorModel: Model<DoctorDocument>,
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
}
