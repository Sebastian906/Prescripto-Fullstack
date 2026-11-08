import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import {
  Payment,
  PaymentDocument,
  PaymentMethod,
  PaymentStatus,
} from './schemas/payment.schema';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export interface CreatePaymentInput {
  appointmentId: string;
  userId: string;
  amount: number;
  currency: string;
}

export interface StripePaymentInput extends CreatePaymentInput {
  stripePaymentIntentId: string;
  last4?: string;
}

export interface PaymentTransition {
  payment: PaymentDocument;
  transitioned: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  // COD is synchronous: create pending, then transition to paid. Repeated
  // calls return the existing paid row instead of duplicating it.
  async createForCod(input: CreatePaymentInput): Promise<PaymentDocument> {
    return this.createPendingThenPay(input, 'cod');
  }

  // Saga E-02f: a checkout that never completes must leave an observable
  // pending row. Never overwrites an existing paid/refunded row.
  async createForStripePending(
    input: CreatePaymentInput,
  ): Promise<PaymentDocument | null> {
    try {
      await this.paymentModel.updateOne(
        { appointmentId: input.appointmentId },
        {
          $setOnInsert: {
            ...input,
            method: 'stripe' as PaymentMethod,
            status: 'pending' as PaymentStatus,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
    return this.paymentModel.findOne({ appointmentId: input.appointmentId });
  }

  // Idempotent by stripePaymentIntentId. The first delivery wins the
  // pending→paid transition; replays return transitioned=false.
  async upsertFromStripeEvent(
    input: StripePaymentInput,
  ): Promise<PaymentTransition> {
    const byIntent = await this.paymentModel.findOne({
      stripePaymentIntentId: input.stripePaymentIntentId,
    });
    if (byIntent) return this.transitionPaid(byIntent);

    const byAppointment = await this.paymentModel.findOne({
      appointmentId: input.appointmentId,
    });
    if (byAppointment) return this.transitionPaid(byAppointment, input);

    try {
      const created = await this.paymentModel.create({
        ...input,
        method: 'stripe' as PaymentMethod,
        status: 'paid' as PaymentStatus,
        paidAt: new Date(),
        createdAt: new Date(),
      });
      return { payment: created, transitioned: true };
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const raced =
        (await this.paymentModel.findOne({
          stripePaymentIntentId: input.stripePaymentIntentId,
        })) ??
        (await this.paymentModel.findOne({
          appointmentId: input.appointmentId,
        }));
      if (!raced) throw error;
      return { payment: raced, transitioned: false };
    }
  }

  // Compensation: checkout expired or payment failed. Only pending rows move.
  async markFailed(appointmentId: string): Promise<void> {
    await this.paymentModel.findOneAndUpdate(
      { appointmentId, status: 'pending' },
      { $set: { status: 'failed' as PaymentStatus } },
    );
  }

  // Refunds are traceable: Payment keeps status, amount and timestamps.
  // Stripe refunds use an idempotency key to survive retries.
  async refund(
    appointmentId: string,
    amount?: number,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({ appointmentId });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'paid') {
      throw new BadRequestException(
        `Cannot refund a ${payment.status} payment`,
      );
    }

    if (payment.method === 'stripe' && payment.stripePaymentIntentId) {
      await this.stripe.refunds.create(
        {
          payment_intent: payment.stripePaymentIntentId,
          ...(amount ? { amount: Math.round(amount * 100) } : {}),
        },
        { idempotencyKey: `refund:${String(payment._id)}:${amount ?? 'full'}` },
      );
    }

    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, status: 'paid' },
      {
        $set: {
          status: 'refunded' as PaymentStatus,
          refundedAmount: amount ?? payment.amount,
          refundedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!updated) throw new BadRequestException('Payment already refunded');
    return updated;
  }

  async getStatusForAppointment(
    appointmentId: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ appointmentId });
  }

  private async createPendingThenPay(
    input: CreatePaymentInput,
    method: PaymentMethod,
  ): Promise<PaymentDocument> {
    const existing = await this.paymentModel.findOne({
      appointmentId: input.appointmentId,
    });
    if (existing?.status === 'paid') return existing;
    if (existing?.status === 'refunded') {
      throw new BadRequestException('Appointment payment was refunded');
    }

    if (!existing) {
      try {
        await this.paymentModel.create({
          ...input,
          method,
          status: 'pending',
          createdAt: new Date(),
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }

    const paid = await this.paymentModel.findOneAndUpdate(
      { appointmentId: input.appointmentId, status: 'pending' },
      {
        $set: {
          status: 'paid' as PaymentStatus,
          method,
          paidAt: new Date(),
        },
      },
      { new: true },
    );
    if (paid) return paid;

    const current = await this.paymentModel.findOne({
      appointmentId: input.appointmentId,
    });
    if (current?.status === 'paid') return current;
    throw new BadRequestException('Payment could not be confirmed');
  }

  private async transitionPaid(
    payment: PaymentDocument,
    input?: StripePaymentInput,
  ): Promise<PaymentTransition> {
    if (payment.status !== 'pending') {
      return { payment, transitioned: false };
    }

    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, status: 'pending' },
      {
        $set: {
          status: 'paid' as PaymentStatus,
          paidAt: new Date(),
          ...(input
            ? {
                stripePaymentIntentId: input.stripePaymentIntentId,
                method: 'stripe' as PaymentMethod,
                amount: input.amount,
                currency: input.currency,
                ...(input.last4 ? { last4: input.last4 } : {}),
              }
            : {}),
        },
      },
      { new: true },
    );
    if (!updated) return { payment, transitioned: false };
    return { payment: updated, transitioned: true };
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
