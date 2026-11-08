import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import Stripe from 'stripe';
import {
  Appointment,
  AppointmentDocument,
} from 'src/appointments/schemas/appointment.schema';
import {
  Payment,
  PaymentDocument,
  PaymentMethod,
} from './schemas/payment.schema';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export interface CreatePaymentInput {
  appointmentId: string;
  userId: string;
  amount: number;
  currency: string;
  stripeSessionId?: string;
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
    @Optional()
    @InjectModel(Appointment.name)
    private readonly appointmentModel?: Model<AppointmentDocument>,
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
            method: 'stripe',
            status: 'pending',
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
    if (byIntent) return this.transitionPaid(byIntent, input);

    const byAppointment = await this.paymentModel.findOne({
      appointmentId: input.appointmentId,
    });
    if (byAppointment) {
      const result = await this.transitionPaid(byAppointment, input);
      if (
        !result.transitioned &&
        byAppointment.status === 'paid' &&
        byAppointment.stripePaymentIntentId &&
        byAppointment.stripePaymentIntentId !== input.stripePaymentIntentId
      ) {
        // A second captured intent for the same appointment cannot be stored
        // under the unique appointmentId without breaking the contract.
        // Surface it for manual reconciliation instead of silently replaying.
        this.logger.warn(
          `stripe distinct intent for paid appointment=${input.appointmentId} existing=${byAppointment.stripePaymentIntentId} incoming=${input.stripePaymentIntentId}`,
        );
      }
      return result;
    }

    try {
      const created = await this.paymentModel.create({
        ...input,
        method: 'stripe',
        status: 'paid',
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
      return this.transitionPaid(raced, input);
    }
  }

  // Compensation: checkout expired or payment failed. Only pending rows move,
  // and only the session that expired owns the row. If the pending upsert was
  // lost, this creates the failed row so the abandoned checkout stays visible.
  async markFailed(input: {
    appointmentId: string;
    userId: string;
    amount: number;
    currency: string;
    stripeSessionId?: string;
  }): Promise<void> {
    const filter: Record<string, unknown> = {
      appointmentId: input.appointmentId,
      status: 'pending',
    };
    if (input.stripeSessionId) filter.stripeSessionId = input.stripeSessionId;

    const updated = await this.paymentModel.findOneAndUpdate(filter, {
      $set: { status: 'failed' },
    });
    if (updated) return;

    try {
      await this.paymentModel.updateOne(
        { appointmentId: input.appointmentId },
        {
          $setOnInsert: {
            ...input,
            method: 'stripe',
            status: 'failed',
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      // A paid row or a newer session owns the appointmentId: do not overwrite.
      if (!isDuplicateKeyError(error)) throw error;
    }
  }

  // Refunds are traceable: Payment keeps status, amount and timestamps.
  // The amount is normalized once and used for both Stripe and the DB.
  // `refundPendingAmount` is the recovery marker: if Stripe succeeds but the
  // finalize write fails, a retry reuses the same idempotency key and finishes
  // the row instead of charging a second time.
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

    const alreadyRefunded = payment.refundedAmount ?? 0;
    let normalized = payment.refundPendingAmount ?? 0;

    if (!normalized) {
      const remaining = payment.amount - alreadyRefunded;
      normalized = normalizeMoney(amount ?? remaining);
      if (!Number.isFinite(normalized) || normalized <= 0) {
        throw new BadRequestException('Refund amount must be positive');
      }
      if (normalized > remaining) {
        throw new BadRequestException('Refund exceeds remaining amount');
      }

      // Reserve before touching Stripe: a concurrent refund loses this CAS.
      const reserved = await this.paymentModel.findOneAndUpdate(
        {
          _id: payment._id,
          status: 'paid',
          refundPendingAmount: null,
        },
        {
          $set: {
            refundPendingAmount: normalized,
            refundStatus: 'processing',
          },
        },
        { new: true },
      );
      if (!reserved) {
        throw new BadRequestException('Refund already in progress; retry');
      }
    }

    let stripeRefund: Stripe.Refund | undefined;
    try {
      if (payment.method === 'stripe' && payment.stripePaymentIntentId) {
        stripeRefund = await this.stripe.refunds.create(
          {
            payment_intent: payment.stripePaymentIntentId,
            amount: Math.round(normalized * 100),
          },
          {
            idempotencyKey: `refund:${String(payment._id)}:${alreadyRefunded + normalized}`,
          },
        );
      }
    } catch (error) {
      // Release the reservation so a later retry can allocate a fresh amount.
      await this.paymentModel.updateOne(
        { _id: payment._id, refundPendingAmount: normalized },
        {
          $set: {
            refundPendingAmount: null,
            refundStatus: null,
          },
        },
      );
      throw error;
    }

    const fullyRefunded = alreadyRefunded + normalized >= payment.amount;
    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, refundPendingAmount: normalized },
      {
        $set: {
          refundedAmount: alreadyRefunded + normalized,
          refundPendingAmount: null,
          status: fullyRefunded ? 'refunded' : 'paid',
          ...(fullyRefunded ? { refundedAt: new Date() } : {}),
          ...(stripeRefund
            ? {
                stripeRefundId: stripeRefund.id,
                refundStatus: stripeRefund.status,
              }
            : { refundStatus: 'succeeded' }),
        },
      },
      { new: true },
    );
    if (!updated) {
      // Another request may have finalized the same reservation.
      const latest = await this.paymentModel.findOne({
        appointmentId: payment.appointmentId,
      });
      if (latest && latest.refundPendingAmount == null) return latest;
      throw new BadRequestException('Refund state changed; retry');
    }

    // A full refund means the appointment is no longer paid. Partial refunds
    // keep the mirror true so verify-payment stays eligible.
    if (fullyRefunded && this.appointmentModel) {
      await this.appointmentModel.updateOne(
        { _id: payment.appointmentId },
        { $set: { payment: false } },
      );
    }

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

    // `failed` is recoverable: a COD attempt after an abandoned checkout must
    // not stay stuck. COD also releases any stale Stripe unique reservation.
    const update: UpdateQuery<PaymentDocument> = {
      $set: {
        status: 'paid',
        method,
        paidAt: new Date(),
      },
    };
    if (method === 'cod') {
      update.$unset = {
        stripePaymentIntentId: 1,
        stripeSessionId: 1,
        last4: 1,
      };
    }

    const paid = await this.paymentModel.findOneAndUpdate(
      {
        appointmentId: input.appointmentId,
        status: { $in: ['pending', 'failed'] },
      },
      update,
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
    if (payment.status !== 'pending' && payment.status !== 'failed') {
      return { payment, transitioned: false };
    }

    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, status: { $in: ['pending', 'failed'] } },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          ...(input
            ? {
                stripePaymentIntentId: input.stripePaymentIntentId,
                method: 'stripe',
                amount: input.amount,
                currency: input.currency,
                ...(input.stripeSessionId
                  ? { stripeSessionId: input.stripeSessionId }
                  : {}),
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

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
