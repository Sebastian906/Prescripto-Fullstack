import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from './schemas/doctor.schema';
import { Appointment, AppointmentSchema } from 'src/appointments/schemas/appointment.schema';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { ConfigModule } from '@nestjs/config';
import { AuthDoctorModule } from 'src/shared/guards/auth-doctor.module';
import { ReportsModule } from 'src/reports/reports.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AuthAdminModule,
    AuthDoctorModule,
    ConfigModule,
    ReportsModule,
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule { }