import { MigrationService } from 'src/migration/migration.service';

function makeService(
  appointmentModel: any,
  paymentModel: any,
): MigrationService {
  return new MigrationService(
    {} as any,
    {} as any,
    appointmentModel,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    paymentModel,
  );
}

describe('MigrationService', () => {
  it('should be defined', () => {
    const service = makeService({}, {});
    expect(service).toBeDefined();
  });

  it('migratePayments is idempotent and maps legacy fields', async () => {
    const docs = [
      {
        _id: 'a1',
        userId: 'u1',
        amount: 100,
        date: Date.now(),
        payment: true,
        stripePaymentIntentId: 'pi_1',
      },
      {
        _id: 'a2',
        userId: 'u2',
        amount: 50,
        date: Date.now(),
        payment: 'pending',
      },
      {
        _id: 'a3',
        userId: 'u3',
        amount: 30,
        date: Date.now(),
        payment: true,
      },
    ];
    const appointmentModel = {
      collection: {
        find: jest.fn(() =>
          (async function* () {
            for (const doc of docs) {
              // `await` keeps @typescript-eslint/require-await happy while
              // preserving async-iterator output.
              await Promise.resolve();
              yield doc;
            }
          })(),
        ),
      },
    };
    const payments: Record<string, any>[] = [];
    const paymentModel = {
      updateOne: jest.fn(
        (
          filter: { appointmentId: string },
          update: { $setOnInsert: Record<string, any> },
          options?: { upsert?: boolean },
        ) => {
          const existing = payments.some(
            (p) => p.appointmentId === filter.appointmentId,
          );
          if (existing) return Promise.resolve({ upsertedCount: 0 });
          if (!options?.upsert) return Promise.resolve({ upsertedCount: 0 });
          payments.push({ ...update.$setOnInsert });
          return Promise.resolve({ upsertedCount: 1 });
        },
      ),
      countDocuments: jest.fn(() => Promise.resolve(payments.length)),
    };
    const service = makeService(appointmentModel, paymentModel);

    const first = await service.migrateCollection('payments');
    const second = await service.migrateCollection('payments');

    expect(first).toMatchObject({ migrated: 3, skipped: 0, errors: 0 });
    expect(second).toMatchObject({ migrated: 0, skipped: 3, errors: 0 });
    expect(payments).toHaveLength(3);
    expect(payments[0]).toMatchObject({
      appointmentId: 'a1',
      method: 'stripe',
      status: 'paid',
      stripePaymentIntentId: 'pi_1',
    });
    expect(payments[1]).toMatchObject({
      appointmentId: 'a2',
      method: 'stripe',
      status: 'pending',
    });
    expect(payments[2]).toMatchObject({
      appointmentId: 'a3',
      method: 'cod',
      status: 'paid',
    });
    expect(payments[2].stripePaymentIntentId).toBeUndefined();
    expect(paymentModel.updateOne).toHaveBeenCalledTimes(6);
  });
});
