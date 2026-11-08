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
  stripeSessionId?: string;
  stripeRefundId?: string;
  refundStatus?: string | null;
  refundPendingAmount?: number | null;
  refundedAmount?: number | null;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt?: Date;
}

class FakePaymentModel {
  docs: PaymentRow[] = [];
  createdStatuses: string[] = [];
  failNextFinalize = false;
  private seq = 0;

  findOne(filter: Record<string, any>): Promise<PaymentRow | null> {
    return Promise.resolve(
      this.docs.find((doc) => this.matches(doc, filter)) ?? null,
    );
  }

  create(input: Record<string, any>): Promise<PaymentRow> {
    const duplicate =
      this.docs.some((doc) => doc.appointmentId === input.appointmentId) ||
      (input.stripePaymentIntentId &&
        this.docs.some(
          (doc) => doc.stripePaymentIntentId === input.stripePaymentIntentId,
        ));
    if (duplicate) {
      const error = new Error('duplicate key') as Error & { code?: number };
      error.code = 11000;
      return Promise.reject(error);
    }
    const doc = { _id: `p${++this.seq}`, ...input } as PaymentRow;
    this.docs.push(doc);
    this.createdStatuses.push(String(doc.status));
    return Promise.resolve(doc);
  }

  findOneAndUpdate(
    filter: Record<string, any>,
    update: { $set?: Record<string, any>; $unset?: Record<string, any> },
    _options?: Record<string, any>,
  ): Promise<PaymentRow | null> {
    if (
      this.failNextFinalize &&
      update.$set &&
      'refundPendingAmount' in update.$set &&
      update.$set.refundPendingAmount === null
    ) {
      this.failNextFinalize = false;
      return Promise.resolve(null);
    }

    const doc = this.docs.find((row) => this.matches(row, filter));
    if (!doc) return Promise.resolve(null);
    this.apply(doc, update);
    return Promise.resolve(doc);
  }

  updateOne(
    filter: Record<string, any>,
    update: {
      $set?: Record<string, any>;
      $setOnInsert?: Record<string, any>;
      $unset?: Record<string, any>;
    },
    options?: { upsert?: boolean },
  ): Promise<{ upsertedCount: number; modifiedCount: number }> {
    const doc = this.docs.find((row) => this.matches(row, filter));
    if (doc) {
      this.apply(doc, update);
      return Promise.resolve({ upsertedCount: 0, modifiedCount: 1 });
    }
    if (options?.upsert && update.$setOnInsert) {
      this.docs.push({
        _id: `p${++this.seq}`,
        ...(update.$setOnInsert as PaymentRow),
      });
      return Promise.resolve({ upsertedCount: 1, modifiedCount: 0 });
    }
    return Promise.resolve({ upsertedCount: 0, modifiedCount: 0 });
  }

  private apply(
    doc: PaymentRow,
    update: { $set?: Record<string, any>; $unset?: Record<string, any> },
  ): void {
    if (update.$set) Object.assign(doc, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        delete (doc as Record<string, any>)[key];
      }
    }
  }

  private matches(doc: PaymentRow, filter: Record<string, any>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const current = (doc as Record<string, any>)[key];
      if (value && typeof value === 'object' && '$in' in value) {
        return (value.$in as any[]).includes(current);
      }
      if (value === null) return current === null || current === undefined;
      return current === value || String(current) === String(value);
    });
  }
}

function makeService() {
  const model = new FakePaymentModel();
  const stripe = {
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_1', status: 'succeeded' }),
    },
  };
  const appointmentModel = {
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  const service = new PaymentsService(
    model as any,
    stripe as any,
    appointmentModel as any,
  );
  return { model, stripe, appointmentModel, service };
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
      stripeSessionId: 'cs_1',
    };

    const first = await service.upsertFromStripeEvent(input);
    const second = await service.upsertFromStripeEvent(input);

    expect(first.transitioned).toBe(true);
    expect(second.transitioned).toBe(false);
    expect(model.docs).toHaveLength(1);
    expect(model.docs[0].status).toBe('paid');
  });

  it('pending Payment + double delivery transitions once and records intent', async () => {
    const { model, service } = makeService();
    await service.createForStripePending({
      appointmentId: 'a1b',
      userId: 'u1b',
      amount: 100,
      currency: 'usd',
      stripeSessionId: 'cs_1b',
    });

    const input = {
      appointmentId: 'a1b',
      userId: 'u1b',
      amount: 100,
      currency: 'usd',
      stripePaymentIntentId: 'pi_1b',
      stripeSessionId: 'cs_1b',
    };
    const first = await service.upsertFromStripeEvent(input);
    const second = await service.upsertFromStripeEvent(input);

    expect(first.transitioned).toBe(true);
    expect(second.transitioned).toBe(false);
    expect(model.docs[0]).toMatchObject({
      status: 'paid',
      stripePaymentIntentId: 'pi_1b',
      stripeSessionId: 'cs_1b',
    });
  });

  it('COD creates pending then paid without Stripe fields', async () => {
    const { model, service } = makeService();
    const payment = await service.createForCod({
      appointmentId: 'a2',
      userId: 'u2',
      amount: 40,
      currency: 'usd',
    });

    expect(model.createdStatuses).toEqual(['pending']);
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

  it('partial refunds stay paid until the full amount is refunded', async () => {
    const { model, appointmentModel, service } = makeService();
    await service.createForCod({
      appointmentId: 'a4',
      userId: 'u4',
      amount: 100,
      currency: 'usd',
    });

    const first = await service.refund('a4', 30);
    expect(first.status).toBe('paid');
    expect(first.refundedAmount).toBe(30);
    expect(appointmentModel.updateOne).not.toHaveBeenCalled();

    const second = await service.refund('a4', 70);
    expect(second.status).toBe('refunded');
    expect(second.refundedAmount).toBe(100);
    expect(model.docs[0].refundedAt).toBeInstanceOf(Date);
    expect(appointmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'a4' },
      { $set: { payment: false } },
    );
  });

  it('refund recovery reuses the same Stripe idempotency key', async () => {
    const { model, stripe, service } = makeService();
    await service.upsertFromStripeEvent({
      appointmentId: 'a5',
      userId: 'u5',
      amount: 75,
      currency: 'usd',
      stripePaymentIntentId: 'pi_5',
    });

    model.failNextFinalize = true;
    await expect(service.refund('a5')).rejects.toThrow(
      'Refund state changed; retry',
    );

    const recovered = await service.refund('a5');
    expect(recovered.status).toBe('refunded');
    expect(stripe.refunds.create).toHaveBeenCalledTimes(2);

    const firstKey = stripe.refunds.create.mock.calls[0][1].idempotencyKey;
    const secondKey = stripe.refunds.create.mock.calls[1][1].idempotencyKey;
    expect(firstKey).toBe(secondKey);
    expect(firstKey).toBeTruthy();
  });

  it('rejects a refund above the remaining amount before calling Stripe', async () => {
    const { stripe, service } = makeService();
    await service.createForCod({
      appointmentId: 'a6',
      userId: 'u6',
      amount: 20,
      currency: 'usd',
    });

    await expect(service.refund('a6', 30)).rejects.toThrow(
      'Refund exceeds remaining amount',
    );
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('verify path reads Payment.status', async () => {
    const { service } = makeService();
    await service.createForCod({
      appointmentId: 'a7',
      userId: 'u7',
      amount: 20,
      currency: 'usd',
    });

    const payment = await service.getStatusForAppointment('a7');
    expect(payment?.status).toBe('paid');
  });
});
