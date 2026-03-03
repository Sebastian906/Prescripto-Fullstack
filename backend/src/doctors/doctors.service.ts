import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';

@Injectable()
export class DoctorsService {
    constructor(
        @InjectModel(Doctor.name)
        private readonly doctorModel: Model<DoctorDocument>,
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
}
