import { ConsentService } from '../consent/consent.service';

describe('ConsentService (owner-only)', () => {
  const store: any[] = [
    {
      _id: 'c1',
      userId: 'u1',
      scope: 'marketing',
      version: 'v1',
      status: 'granted',
    },
  ];
  const model = {
    findOneAndUpdate: jest.fn((f: any, u: any) => ({
      exec: () => Promise.resolve({ _id: 'c1', ...f, ...u.$set }),
    })),
    find: jest.fn((f: any) => ({
      lean: () => ({
        exec: () => Promise.resolve(store.filter((c) => c.userId === f.userId)),
      }),
    })),
    findById: jest.fn((id: string) => ({
      lean: () => ({
        exec: () => Promise.resolve(store.find((c) => c._id === id) ?? null),
      }),
    })),
  } as any;

  it('writable and readable by owner', async () => {
    const svc = new ConsentService(model);
    const saved = await svc.upsert('u1', {
      scope: 'marketing',
      version: 'v1',
      status: 'granted',
    } as any);
    expect(saved.status).toBe('granted');
    expect(await svc.mine('u1')).toHaveLength(1);
    expect((await svc.getOwned('u1', 'c1')).userId).toBe('u1');
  });

  it('forbids non-owner read', async () => {
    const svc = new ConsentService(model);
    await expect(svc.getOwned('u2', 'c1')).rejects.toThrow('Not your consent');
  });
});

describe('ConsentService.hasGrantedScope (latest action wins)', () => {
  function buildService(latest: { status: string } | null) {
    const sort = jest.fn(() => ({
      lean: () => ({ exec: () => Promise.resolve(latest) }),
    }));
    const model = {
      findOne: jest.fn(() => ({ sort })),
    } as any;
    return { service: new ConsentService(model), model, sort };
  }

  it('returns true when the latest action is granted', async () => {
    const { service } = buildService({ status: 'granted' });
    await expect(service.hasGrantedScope('u1', 'treatment')).resolves.toBe(
      true,
    );
  });

  it('returns false when a newer version was revoked', async () => {
    // v1 granted + v2 revoked: la última acción es revoked.
    const { service } = buildService({ status: 'revoked' });
    await expect(service.hasGrantedScope('u1', 'treatment')).resolves.toBe(
      false,
    );
  });

  it('returns false when there is no consent', async () => {
    const { service } = buildService(null);
    await expect(service.hasGrantedScope('u1', 'treatment')).resolves.toBe(
      false,
    );
  });

  it('queries the scope and sorts by most recently updated', async () => {
    const { service, model, sort } = buildService({ status: 'granted' });
    await service.hasGrantedScope('u1', 'treatment');
    expect(model.findOne).toHaveBeenCalledWith({
      userId: 'u1',
      scope: 'treatment',
    });
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1, _id: -1 });
  });
});
