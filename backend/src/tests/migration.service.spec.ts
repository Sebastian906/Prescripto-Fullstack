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

  it('migratePayments is idempotent', async () => {
    const docs = [
      {
        _id: 'a1',
        userId: 'u1',
        amount: 100,
        date: Date.now(),
        payment: true,
      },
    ];
    const appointmentModel = {
      collection: {
        find: jest.fn(() =>
          (async function* () {
            for (const doc of docs) yield doc;
          })(),
        ),
      },
    };
    let upserted = 1;
    const paymentModel = {
      updateOne: jest.fn(() => Promise.resolve({ upsertedCount: upserted })),
    };
    const service = makeService(appointmentModel, paymentModel);

    const first = await service.migrateCollection('payments');
    upserted = 0;
    const second = await service.migrateCollection('payments');

    expect(first.migrated).toBe(1);
    expect(second.migrated).toBe(0);
    expect(second.skipped).toBe(1);
    expect(paymentModel.updateOne).toHaveBeenCalledTimes(2);
  });
});
