import { MigrationService } from 'src/migration/migration.service';

describe('Availability migration idempotency', () => {
  it('rerun estable: $addToSet+$each no duplica', async () => {
    const store = new Map<string, Set<string>>();
    const availabilityModel = {
      bulkWrite: (
        ops: Array<{
          updateOne: {
            filter: { doctorId: string; date: string };
            update: { $addToSet: { slots: { $each: string[] } } };
          };
        }>,
      ) => {
        let upsertedCount = 0;
        let modifiedCount = 0;
        for (const op of ops) {
          const key = `${op.updateOne.filter.doctorId}|${op.updateOne.filter.date}`;
          const isNew = !store.has(key);
          const set = store.get(key) ?? new Set<string>();
          store.set(key, set);
          const before = set.size;
          for (const t of op.updateOne.update.$addToSet.slots.$each) set.add(t);
          if (isNew) upsertedCount++;
          else if (set.size > before) modifiedCount++;
        }
        return Promise.resolve({ upsertedCount, modifiedCount });
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
