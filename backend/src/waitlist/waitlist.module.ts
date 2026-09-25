import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistSchema } from './schemas/waitlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Waitlist.name, schema: WaitlistSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    AuthUserModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
