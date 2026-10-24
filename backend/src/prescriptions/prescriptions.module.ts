import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from 'src/audit/audit.module';
import { ConsentModule } from 'src/consent/consent.module';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from 'src/medical-records/schemas/medical-record.schema';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { AuthDoctorModule } from 'src/shared/guards/auth-doctor.module';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import {
  Prescription,
  PrescriptionSchema,
} from './schemas/prescription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
    ]),
    AuthDoctorModule,
    AuthUserModule,
    AuthAdminModule,
    ConsentModule,
    AuditModule,
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
