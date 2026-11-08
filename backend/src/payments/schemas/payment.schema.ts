import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;
export type PaymentMethod = 'cod' | 'stripe';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

@Schema({ minimize: false })
export class Payment {
  @Prop({ required: true })
  appointmentId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 'usd' })
  currency!: string;

  @Prop({ required: true, type: String, enum: ['cod', 'stripe'] })
  method!: PaymentMethod;

  @Prop({
    required: true,
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true,
  })
  status!: PaymentStatus;

  // Sparse unique: COD rows have no intent id, so multiple missing values are
  // allowed. This is the webhook idempotency key.
  @Prop()
  stripePaymentIntentId?: string;

  // Reserved for Stripe card metadata. Never store PAN/CVC.
  @Prop()
  last4?: string;

  @Prop({ type: Number, default: null })
  refundedAmount?: number | null;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  @Prop({ type: Date, default: null })
  refundedAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// One Payment per appointment: the booking→payment saga has a single leg.
PaymentSchema.index({ appointmentId: 1 }, { unique: true });
// Duplicate Stripe deliveries converge on this index.
PaymentSchema.index(
  { stripePaymentIntentId: 1 },
  { unique: true, sparse: true },
);
