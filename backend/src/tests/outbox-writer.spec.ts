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

describe('OutboxMongooseAdapter (transactional outbox writer)', () => {
  it('append forwards the caller session so the row commits with the booking', async () => {
    const { model, create } = fakeModel();
    const adapter = new OutboxMongooseAdapter(model);
    const session = { id: 'tx-1' };

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

  it('booked payload stays IDs + timestamps only', async () => {
    const { model, create } = fakeModel();
    const adapter = new OutboxMongooseAdapter(model);

    await adapter.append('booked', {
      appointmentId: 'a1',
      patientId: 'u1',
      doctorId: 'd1',
      scheduledAt: new Date(),
      createdAt: new Date(),
    });

    const payload = create.mock.calls[0][0][0].payload;
    expect(Object.keys(payload).sort()).toEqual([
      'appointmentId',
      'createdAt',
      'doctorId',
      'patientId',
      'scheduledAt',
    ]);
  });

  it('findUndispatched filters dispatchedAt:null, FIFO by createdAt, respects limit', async () => {
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