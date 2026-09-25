import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService, toSlotDateKey, toSlotTime } from './waitlist.service';
import { WaitlistSchema } from './schemas/waitlist.schema';

describe('WaitlistService', () => {
  const doctorId = '64f1a2b3c4d5e6f7a8b9c0d1';
  let service: WaitlistService;
  let waitlistModel: { findOne: jest.Mock; create: jest.Mock; findOneAndUpdate: jest.Mock };
  let doctorModel: { findById: jest.Mock };

  beforeEach(async () => {
    waitlistModel = { findOne: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn() };
    doctorModel = { findById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: getModelToken('Waitlist'), useValue: waitlistModel },
        { provide: getModelToken('Doctor'), useValue: doctorModel },
      ],
    }).compile();
    service = module.get<WaitlistService>(WaitlistService);
  });

  it('derives AM for 00-11 and PM for 12-23', () => {
    expect(toSlotTime(new Date(2026, 9, 5, 9, 30))).toMatch(/AM$/);
    expect(toSlotTime(new Date(2026, 9, 5, 0, 15))).toMatch(/AM$/);
    expect(toSlotTime(new Date(2026, 9, 5, 12, 0))).toMatch(/PM$/);
    expect(toSlotTime(new Date(2026, 9, 5, 14, 30))).toMatch(/PM$/);
    expect(toSlotDateKey(new Date(2026, 6, 20))).toBe('20_7_2026');
  });

  it('declares FIFO + mine + dedupe + TTL(30d on createdAt) indexes', () => {
    const idx = WaitlistSchema.indexes() as Array<[Record<string, 1 | -1>, Record<string, unknown>?]>;
    const hasFifo = idx.some(([k]) => k['doctorId'] === 1 && k['slotDateKey'] === 1 && k['createdAt'] === 1);
    const hasMine = idx.some(([k]) => k['userId'] === 1);
    const hasTtl = idx.some(([k, o]) => k['createdAt'] === 1 && o?.['expireAfterSeconds'] === 2592000);
    expect(hasFifo).toBe(true);
    expect(hasMine).toBe(true);
    expect(hasTtl).toBe(true);
  });

  it('FIFO: join rejects duplicate waiting entry (409)', async () => {
    doctorModel.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: doctorId }) }) });
    waitlistModel.findOne.mockReturnValue({ lean: () => Promise.resolve({ _id: 'dup' }) });
    await expect(
      service.join('user1', { doctorId, wantedDate: '2026-11-05T14:30:00.000Z' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('concurrency: 2 waiters / 1 slot -> exactly 1 promoted', async () => {
    const first = { _id: 'w1', status: 'promoted' };
    waitlistModel.findOneAndUpdate
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(null);
    const session = {} as never;
    const r1 = await service.promoteEarliest(doctorId, '5_11_2026', '02:30 PM', session);
    const r2 = await service.promoteEarliest(doctorId, '5_11_2026', '02:30 PM', session);
    expect([r1, r2].filter(Boolean)).toHaveLength(1);
    const call = waitlistModel.findOneAndUpdate.mock.calls[0][2] as Record<string, unknown>;
    expect(call['sort']).toEqual({ createdAt: 1 });
    expect(call['session']).toBe(session);
  });
});
