import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/database/database.module';
import { CloudinaryModule } from './shared/cloudinary/cloudinary.module';
import { DoctorsModule } from './doctors/doctors.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SpecialitiesModule } from './specialities/specialities.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ReportsModule } from './reports/reports.module';
import { MigrationModule } from './migration/migration.module';
import { PostgresService } from './migration/postgres.service';
import { ThrottlerConfigModule } from './shared/throttler/throttler.module';
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';
import { AuditModule } from './audit/audit.module';
import { ConsentService } from './consent/consent.service';
import { ConsentController } from './consent/consent.controller';
import { ConsentModule } from './consent/consent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerConfigModule,
    DatabaseModule,
    CloudinaryModule,
    DoctorsModule,
    UsersModule,
    AdminModule,
    AuthModule,
    AppointmentsModule,
    SpecialitiesModule,
    SchedulingModule,
    ReportsModule,
    MigrationModule,
    AuditModule,
    ConsentModule,
  ],
  controllers: [AppController, AuditController, ConsentController],
  providers: [AppService, PostgresService, AuditService, ConsentService],
})
export class AppModule {}
