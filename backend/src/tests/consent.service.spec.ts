import { ConsentService } from '../consent/consent.service';

describe('ConsentService (owner-only)', () => {
    const store: any[] = [{ _id: 'c1', userId: 'u1', scope: 'marketing', version: 'v1', status: 'granted' }];
    const model = {
        findOneAndUpdate: jest.fn((f: any, u: any) => ({ exec: () => Promise.resolve({ _id: 'c1', ...f, ...u.$set }) })),
        find: jest.fn((f: any) => ({ lean: () => ({ exec: () => Promise.resolve(store.filter((c) => c.userId === f.userId)) }) })),
        findById: jest.fn((id: string) => ({ lean: () => ({ exec: () => Promise.resolve(store.find((c) => c._id === id) ?? null) }) })),
    } as any;

    it('writable and readable by owner', async () => {
        const svc = new ConsentService(model);
        const saved = await svc.upsert('u1', { scope: 'marketing', version: 'v1', status: 'granted' } as any);
        expect(saved.status).toBe('granted');
        expect(await svc.mine('u1')).toHaveLength(1);
        expect((await svc.getOwned('u1', 'c1')).userId).toBe('u1');
    });

    it('forbids non-owner read', async () => {
        const svc = new ConsentService(model);
        await expect(svc.getOwned('u2', 'c1')).rejects.toThrow('Not your consent');
    });
});