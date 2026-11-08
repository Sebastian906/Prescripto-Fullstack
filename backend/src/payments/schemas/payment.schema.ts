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

  // Checkout Session that created this pending row. Expiry events only touch
  // the row they own; a newer session for the same appointment is untouched.
  @Prop({ index: true })
  stripeSessionId?: string;

  // Reserved for Stripe card metadata. Never store PAN/CVC.
  @Prop()
  last4?: string;

  // Refund audit fields returned by Stripe. Kept for reconciliation.
  @Prop()
  stripeRefundId?: string;

  @Prop()
  refundStatus?: string;

  // Recovery marker: amount reserved before calling Stripe. If the finalize
  // write is lost, the next retry reuses this amount and idempotency key.
  @Prop({ type: Number, default: null })
  refundPendingAmount?: number | null;

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
