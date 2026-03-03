import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';
import { CloudinaryModule } from 'src/shared/cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DoctorsModule } from 'src/doctors/doctors.module';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
    CloudinaryModule,
    ConfigModule,
    AuthAdminModule,
    DoctorsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule { }