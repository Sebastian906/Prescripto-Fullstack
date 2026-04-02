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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CloudinaryModule,
    DoctorsModule,
    UsersModule,
    AdminModule,
    AuthModule,
    AppointmentsModule,
    SpecialitiesModule,
    SchedulingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
