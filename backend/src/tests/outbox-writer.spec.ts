import { OutboxMongooseAdapter } from 'src/notifications/outbox.mongoose.adapter';

// Minimal fake of the Mongoose model: records create() args and lets the
// undispatched query be asserted without a real database.
function fakeModel(rows: unknown[] = []) {
  const lean = jest.fn().mockResolvedValue(rows);
  const limit = jest.fn().mockReturnValue({ lean });
  const sort = jest.fn().mockReturnValue({ limit });
  const find = jest.fn().mockReturnValue({ sort });
  const create = jest.fn().mockResolvedValue([]);
  return { model: { create, find } as any, create, find, sort, limit, lean };
}

const session = { id: 'tx-1' };

describe('OutboxMongooseAdapter (outbox writer)', () => {
  it('append forwards the session', async () => {
    const { model, create } = fakeModel();
    const adapter = new OutboxMongooseAdapter(model);

    await adapter.append(
      'booked',
      {
        appointmentId: 'a1',
        patientId: 'u1',
        doctorId: 'd1',
        scheduledAt: new Date('2026-01-01T10:00:00Z'),
        createdAt: new Date('2026-01-01T09:00:00Z'),
      },
      session,
    );

    expect(create).toHaveBeenCalledTimes(1);
    const [docs, options] = create.mock.calls[0];
    expect(options).toEqual({ session });
    expect(docs[0]).toMatchObject({ event: 'booked', dispatchedAt: null });
  });

  it('rejects clinical text in the payload', async () => {
    const { model, create } = fakeModel();
    const adapter = new OutboxMongooseAdapter(model);
    const unsafePayload = {
      appointmentId: 'a1',
      patientId: 'u1',
      doctorId: 'd1',
      scheduledAt: new Date(),
      createdAt: new Date(),
      diagnosis: 'flu',
    };

    await expect(
      adapter.append('booked', unsafePayload as any, session),
    ).rejects.toThrow('unexpected key: diagnosis');

    expect(create).not.toHaveBeenCalled();
  });

  it('findUndispatched filters and limits', async () => {
    const { model, find, sort, limit } = fakeModel([
      { event: 'booked', dispatchedAt: null },
    ]);
    const adapter = new OutboxMongooseAdapter(model);

    const rows = await adapter.findUndispatched(25);

    expect(find).toHaveBeenCalledWith({ dispatchedAt: null });
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(limit).toHaveBeenCalledWith(25);
    expect(rows).toHaveLength(1);
  });
});
