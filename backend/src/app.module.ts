import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { AuditModule } from './audit/audit.module';
import { ConsentModule } from './consent/consent.module';
import { RequestIdMiddleware } from './shared/middleware/request-id.middleware';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { HttpRequestIdFilter } from './shared/filters/http-request-id.filter';
import { WaitlistModule } from './waitlist/waitlist.module';

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
    WaitlistModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PostgresService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: HttpRequestIdFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
