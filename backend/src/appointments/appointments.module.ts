import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';

@Module({
  imports: [
  MongooseModule.forFeature([
    { name: Appointment.name, schema: AppointmentSchema },
    { name: Doctor.name, schema: DoctorSchema },
    { name: User.name, schema: UserSchema },
  ]),
  AuthUserModule,
],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
