import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MonthlyStats,
  MonthlyStatsSchema,
} from './schemas/monthly-stats.schema';
import {
  MonthlyStatsPatient,
  MonthlyStatsPatientSchema,
} from './schemas/monthly-stats-patient.schema';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { AuthDoctorModule } from 'src/shared/guards/auth-doctor.module';
import {
  AppliedStatsEvent,
  AppliedStatsEventSchema,
} from './schemas/applied-stats-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonthlyStats.name, schema: MonthlyStatsSchema },
      { name: MonthlyStatsPatient.name, schema: MonthlyStatsPatientSchema },
      { name: AppliedStatsEvent.name, schema: AppliedStatsEventSchema },
    ]),
    AuthAdminModule,
    AuthDoctorModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
