import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import Stripe from 'stripe';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';
import {
  Appointment,
  AppointmentSchema,
} from 'src/appointments/schemas/appointment.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService, STRIPE_CLIENT } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    ConfigModule,
    AuthAdminModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Stripe =>
        new Stripe(config.get<string>('STRIPE_SECRET_KEY') ?? 'sk_test_unset'),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
