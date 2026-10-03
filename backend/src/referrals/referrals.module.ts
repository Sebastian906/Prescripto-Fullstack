import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import { AuthDoctorModule } from 'src/shared/guards/auth-doctor.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { Referral, ReferralSchema } from './schemas/referral.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Referral.name, schema: ReferralSchema },
    ]),
    AuthDoctorModule,
    AuthAdminModule,
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
