import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Appointment, AppointmentSchema } from 'src/appointments/schemas/appointment.schema';
import { Speciality, SpecialitySchema } from 'src/specialities/schemas/speciality.schema';
import { MonthlyStats, MonthlyStatsSchema } from 'src/reports/schemas/monthly-stats.schema';
import { PasswordResetToken, PasswordResetTokenSchema } from 'src/auth/password-reset-token.schema';
import { PostgresService } from './postgres.service';

@Module({
  imports: [
    ConfigModule,
    AuthAdminModule,
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: User.name, schema: UserSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Speciality.name, schema: SpecialitySchema },
      { name: MonthlyStats.name, schema: MonthlyStatsSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
  ],
  controllers: [MigrationController],
  providers: [MigrationService, PostgresService],
  exports: [PostgresService],
})
export class MigrationModule { }
