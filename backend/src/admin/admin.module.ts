import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';
import { CloudinaryModule } from 'src/shared/cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DoctorsModule } from 'src/doctors/doctors.module';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { Appointment, AppointmentSchema } from 'src/appointments/schemas/appointment.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CloudinaryModule,
    ConfigModule,
    AuthAdminModule,
    DoctorsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule { }