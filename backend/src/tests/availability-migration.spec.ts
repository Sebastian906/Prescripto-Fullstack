import { MigrationService } from 'src/migration/migration.service';

describe('Availability migration idempotency', () => {
  it('rerun estable: $addToSet+$each no duplica', async () => {
    const store = new Map<string, Set<string>>();
    const availabilityModel = {
      updateOne: async (filter, update, opts) => {
        expect(opts.upsert).toBe(true);
        expect(opts.upsert).toBe(true);
        const key = `${filter.doctorId}|${filter.date}`;
        if (!store.has(key)) {
          store.set(key, new Set());
          for (const t of update.$addToSet.slots.$each) store.get(key)!.add(t);
          return { upsertedCount: 1, modifiedCount: 0 };
        }
        const set = store.get(key)!;
        const before = set.size;
        for (const t of update.$addToSet.slots.$each) set.add(t);
        return Promise.resolve({
          upsertedCount: 0,
          modifiedCount: set.size > before ? 1 : 0,
        });
      },
    };
    // cursor ahora es FUNCIÓN que retorna el iterable (igual que Mongoose)
    const doctorModel = {
      find: () => ({
        select: () => ({
          lean: () => ({
            cursor: () =>
              (async function* () {
                await Promise.resolve();
                yield {
                  _id: 'doc1',
                  slots_booked: { '20_7_2025': ['10:00 AM'] },
                };
              })(),
          }),
        }),
      }),
    };
    const svc = new MigrationService(
      doctorModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      availabilityModel as any, // ← 8º param, ya no hace falta el parche
      {} as any,
      {} as any,
    );
    const r1 = await svc.backfillAvailabilityFromDoctors();
    const r2 = await svc.backfillAvailabilityFromDoctors();
    expect(r1.migrated).toBe(1);
    expect(r2.migrated).toBe(0); // idempotente
    expect(store.get('doc1|20_7_2025')!.size).toBe(1);
  });
});
