import { PaymentsService } from 'src/payments/payments.service';

interface PaymentRow {
  _id: string;
  appointmentId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'cod' | 'stripe';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  refundedAmount?: number;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt?: Date;
}

class FakePaymentModel {
  docs: PaymentRow[] = [];
  private seq = 0;

  async findOne(filter: Record<string, any>): Promise<PaymentRow | null> {
    return this.docs.find((doc) => this.matches(doc, filter)) ?? null;
  }

  async create(input: Record<string, any>): Promise<PaymentRow> {
    const duplicate =
      this.docs.some((doc) => doc.appointmentId === input.appointmentId) ||
      (input.stripePaymentIntentId &&
        this.docs.some(
          (doc) => doc.stripePaymentIntentId === input.stripePaymentIntentId,
        ));
    if (duplicate) {
      const error = new Error('duplicate key') as Error & { code?: number };
      error.code = 11000;
      throw error;
    }
    const doc = { _id: `p${++this.seq}`, ...input } as PaymentRow;
    this.docs.push(doc);
    return doc;
  }

  async findOneAndUpdate(
    filter: Record<string, any>,
    update: { $set?: Record<string, any> },
  ): Promise<PaymentRow | null> {
    const doc = this.docs.find((row) => this.matches(row, filter));
    if (!doc) return null;
    Object.assign(doc, update.$set ?? {});
    return doc;
  }

  async updateOne(
    filter: Record<string, any>,
    update: { $setOnInsert?: Record<string, any> },
    options?: { upsert?: boolean },
  ): Promise<{ upsertedCount: number }> {
    const existing = this.docs.find((row) => this.matches(row, filter));
    if (existing) return { upsertedCount: 0 };
    if (!options?.upsert) return { upsertedCount: 0 };
    this.docs.push({
      _id: `p${++this.seq}`,
      ...(update.$setOnInsert ?? {}),
    } as PaymentRow);
    return { upsertedCount: 1 };
  }

  private matches(doc: PaymentRow, filter: Record<string, any>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const current = (doc as Record<string, any>)[key];
      return current === value || String(current) === String(value);
    });
  }
}

function makeService() {
  const model = new FakePaymentModel();
  const stripe = { refunds: { create: jest.fn().mockResolvedValue({}) } };
  const service = new PaymentsService(model as any, stripe as any);
  return { model, stripe, service };
}

describe('PaymentsService', () => {
  it('double webhook delivery -> single paid transition', async () => {
    const { model, service } = makeService();
    const input = {
      appointmentId: 'a1',
      userId: 'u1',
      amount: 100,
      currency: 'usd',
      stripePaymentIntentId: 'pi_1',
    };

    const first = await service.upsertFromStripeEvent(input);
    const second = await service.upsertFromStripeEvent(input);

    expect(first.transitioned).toBe(true);
    expect(second.transitioned).toBe(false);
    expect(model.docs).toHaveLength(1);
    expect(model.docs[0].status).toBe('paid');
  });

  it('COD creates pending->paid without Stripe fields', async () => {
    const { model, service } = makeService();
    const payment = await service.createForCod({
      appointmentId: 'a2',
      userId: 'u2',
      amount: 40,
      currency: 'usd',
    });

    expect(payment.status).toBe('paid');
    expect(payment.method).toBe('cod');
    expect(payment.stripePaymentIntentId).toBeUndefined();
    expect(model.docs).toHaveLength(1);
  });

  it('duplicate COD converges to the same row', async () => {
    const { model, service } = makeService();
    const input = {
      appointmentId: 'a3',
      userId: 'u3',
      amount: 10,
      currency: 'usd',
    };

    const first = await service.createForCod(input);
    const second = await service.createForCod(input);

    expect(second._id).toBe(first._id);
    expect(model.docs).toHaveLength(1);
  });

  it('refund is traceable and calls Stripe once', async () => {
    const { model, stripe, service } = makeService();
    await service.upsertFromStripeEvent({
      appointmentId: 'a4',
      userId: 'u4',
      amount: 75,
      currency: 'usd',
      stripePaymentIntentId: 'pi_4',
    });

    const refunded = await service.refund('a4');

    expect(refunded.status).toBe('refunded');
    expect(refunded.refundedAmount).toBe(75);
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(model.docs[0].status).toBe('refunded');
  });

  it('verify path reads Payment.status', async () => {
    const { service } = makeService();
    await service.createForCod({
      appointmentId: 'a5',
      userId: 'u5',
      amount: 20,
      currency: 'usd',
    });

    const payment = await service.getStatusForAppointment('a5');
    expect(payment?.status).toBe('paid');
  });
});
