import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { MonthlyStats } from './schemas/monthly-stats.schema';
import { MonthlyStatsPatient } from './schemas/monthly-stats-patient.schema';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(MonthlyStats.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(MonthlyStatsPatient.name),
          useValue: {
            exists: jest.fn(),
            create: jest.fn(),
            countDocuments: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
