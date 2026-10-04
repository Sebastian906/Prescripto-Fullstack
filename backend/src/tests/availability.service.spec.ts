import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  AvailabilityService,
  normalizeSlotDate,
} from '../availability/availability.service';
import { Availability } from 'src/availability/schemas/availability.schema';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  const findOneAndUpdate = jest.fn();
  const updateOne = jest.fn();
  const findOne = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getModelToken(Availability.name),
          useValue: {
            findOneAndUpdate: (...a: unknown[]) => findOneAndUpdate(...a),
            updateOne: (...a: unknown[]) => updateOne(...a),
            findOne: (...a: unknown[]) => findOne(...a),
          },
        },
      ],
    }).compile();
    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normalizeSlotDate convierte legacy con slashes', () => {
    expect(normalizeSlotDate('20/7/2025')).toBe('20_7_2025');
    expect(normalizeSlotDate('20_7_2025')).toBe('20_7_2025');
  });

  it('claim usa filtro anti-duplicado + upsert + cap', async () => {
    findOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'x' }),
    });
    const res = await service.claimSlot('doc1', '20_7_2025', '10:00 AM');
    expect(res.claimed).toBe(true);
    const [filter, update, opts] = findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({
      doctorId: 'doc1',
      date: '20_7_2025',
      slots: { $ne: '10:00 AM' },
    });
    expect(update.$addToSet).toEqual({ slots: '10:00 AM' });
    expect(opts.upsert).toBe(true);
  });

  it('concurrencia: segundo claim al mismo slot reporta taken', async () => {
    findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve(null) });
    findOne.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ slots: ['10:00 AM'] }),
      }),
    });
    const res = await service.claimSlot('doc1', '20_7_2025', '10:00 AM');
    expect(res).toEqual({ claimed: false, reason: 'taken' });
  });

  it('release usa $pull idempotente', async () => {
    updateOne.mockResolvedValue({ acknowledged: true });
    await service.releaseSlot('doc1', '20/7/2025', '10:00 AM');
    expect(updateOne).toHaveBeenCalledWith(
      { doctorId: 'doc1', date: '20_7_2025' },
      { $pull: { slots: '10:00 AM' } },
      expect.anything(),
    );
  });
});
