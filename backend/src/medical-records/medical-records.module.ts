import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from 'src/appointments/schemas/appointment.schema';
import { AuditModule } from 'src/audit/audit.module';
import { ConsentModule } from 'src/consent/consent.module';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { AuthDoctorModule } from 'src/shared/guards/auth-doctor.module';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from './schemas/medical-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AuthDoctorModule,
    AuthUserModule,
    AuthAdminModule,
    ConsentModule,
    AuditModule,
  ],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
