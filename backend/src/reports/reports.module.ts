import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MonthlyStats, MonthlyStatsSchema } from './schemas/monthly-stats.schema';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { AuthDoctorModule } from 'src/shared/guards/auth-doctor.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonthlyStats.name, schema: MonthlyStatsSchema },
    ]),
    AuthAdminModule,
    AuthDoctorModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
