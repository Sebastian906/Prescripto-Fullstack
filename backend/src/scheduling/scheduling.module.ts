import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AuthUserModule,
    ConfigModule,
  ],
  providers: [SchedulingService],
  controllers: [SchedulingController]
})
export class SchedulingModule {}
