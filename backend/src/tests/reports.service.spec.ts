import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { ReportsService, GLOBAL_DOC_ID } from '../reports/reports.service';
import { MonthlyStats } from '../reports/schemas/monthly-stats.schema';
import { MonthlyStatsPatient } from '../reports/schemas/monthly-stats-patient.schema';
import { CacheService } from 'src/shared/cache/cache.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const cache = { invalidatePrefix: jest.fn() };
  const statsModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    cache.invalidatePrefix.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(MonthlyStats.name), useValue: statsModel },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: {
            exists: jest.fn(),
            create: jest.fn(),
            countDocuments: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: { collection: jest.fn() },
        },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onAppointmentBooked invalida la caché del doctor y la global', async () => {
    statsModel.findOne.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });
    statsModel.updateOne.mockResolvedValue({});

    await service.onAppointmentBooked('d1', 'u1', 100, new Date(2026, 0, 5));

    expect(cache.invalidatePrefix).toHaveBeenCalledWith('reports:annual:d1:');
    expect(cache.invalidatePrefix).toHaveBeenCalledWith(
      `reports:annual:${GLOBAL_DOC_ID}:`,
    );
  });

  it('onAppointmentCompleted invalida la caché del doctor y la global', async () => {
    statsModel.updateOne.mockResolvedValue({});

    await service.onAppointmentCompleted('d1', 'u1', 100, new Date(2026, 0, 5));

    expect(cache.invalidatePrefix).toHaveBeenCalledWith('reports:annual:d1:');
    expect(cache.invalidatePrefix).toHaveBeenCalledWith(
      `reports:annual:${GLOBAL_DOC_ID}:`,
    );
  });

  it('onAppointmentCancelled invalida la caché del doctor y la global', async () => {
    statsModel.updateOne.mockResolvedValue({});

    await service.onAppointmentCancelled('d1', new Date(2026, 0, 5));

    expect(cache.invalidatePrefix).toHaveBeenCalledWith('reports:annual:d1:');
    expect(cache.invalidatePrefix).toHaveBeenCalledWith(
      `reports:annual:${GLOBAL_DOC_ID}:`,
    );
  });
});
