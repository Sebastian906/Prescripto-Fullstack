import { backfillPrescriptions } from 'src/migration/migration.service';

describe('backfillPrescriptions', () => {
  it('ensures the collection/index and reports no automatic legacy migration', async () => {
    const createIndexes = jest.fn().mockResolvedValue([]);

    const result = await backfillPrescriptions({ createIndexes } as any);

    expect(createIndexes).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      collection: 'prescriptions',
      migrated: 0,
      skipped: 0,
      errors: 0,
    });
  });

  it('counts an error without throwing when index creation fails', async () => {
    const createIndexes = jest
      .fn()
      .mockRejectedValue(new Error('index creation failed'));

    const result = await backfillPrescriptions({ createIndexes } as any);

    expect(result.errors).toBe(1);
    expect(result.errorDetails?.[0]).toContain('index creation failed');
  });
});
