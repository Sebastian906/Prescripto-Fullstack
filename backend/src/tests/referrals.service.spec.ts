import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { CreateReferralDto } from '../referrals/dto/create-referral.dto';
import { QueryReferralsDto } from '../referrals/dto/query-referrals.dto';
import { ReferralsService } from '../referrals/referrals.service';
import { ReferralReason } from '../referrals/referrals.constants';
import { ReferralSchema } from '../referrals/schemas/referral.schema';

const A = new Types.ObjectId().toHexString();
const B = new Types.ObjectId().toHexString();
const C = new Types.ObjectId().toHexString();

function findMock(docs: unknown[]) {
  return {
    select: () => ({
      limit: () => ({ lean: () => ({ exec: () => Promise.resolve(docs) }) }),
    }),
    limit: () => ({ lean: () => ({ exec: () => Promise.resolve(docs) }) }),
    lean: () => ({ exec: () => Promise.resolve(docs) }),
  };
}

describe('ReferralsService', () => {
  let service: ReferralsService;
  let referralModel: { find: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    referralModel = { find: jest.fn(), create: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: getModelToken('Referral'), useValue: referralModel },
      ],
    }).compile();
    service = module.get<ReferralsService>(ReferralsService);
  });

  it('declares the mandatory { toDoctorId: 1 } index', () => {
    const idx = ReferralSchema.indexes() as Array<[Record<string, number>]>;
    expect(idx.some(([k]) => k['toDoctorId'] === 1)).toBe(true);
    expect(idx.some(([k]) => k['fromDoctorId'] === 1)).toBe(true);
  });

  it('hops=1 returns direct referrers', async () => {
    referralModel.find.mockReturnValueOnce(
      findMock([{ fromDoctorId: new Types.ObjectId(A) }]),
    );
    const res = await service.findReferrers(B, 1);
    expect(res.depth1).toEqual([A]);
    expect(res.depth2).toEqual([]);
  });

  it('hops=2 returns two levels without extra queries per node', async () => {
    referralModel.find
      .mockReturnValueOnce(findMock([{ fromDoctorId: new Types.ObjectId(A) }]))
      .mockReturnValueOnce(findMock([{ fromDoctorId: new Types.ObjectId(C) }]));
    const res = await service.findReferrers(B, 2);
    expect(res.depth1).toEqual([A]);
    expect(res.depth2).toEqual([C]);
    expect(referralModel.find).toHaveBeenCalledTimes(2);
    expect(referralModel.find.mock.calls[1][0]).toHaveProperty('toDoctorId');
  });

  it('hops=3 throws 400', async () => {
    await expect(service.findReferrers(B, 3)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('query DTO: hops=3 fails validation (400 via pipe)', async () => {
    const dto = plainToInstance(QueryReferralsDto, { hops: 3 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('reason outside catalog fails DTO validation (400 via pipe)', async () => {
    const dto = plainToInstance(CreateReferralDto, {
      toDoctorId: B,
      reason: 'free-text-migraine',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('reason outside catalog fails service guard (400)', async () => {
    await expect(
      service.createForDoctor(A, B, 'free-text-migraine'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cycle A->B->A terminates via visited set', async () => {
    referralModel.find
      .mockReturnValueOnce(findMock([{ fromDoctorId: new Types.ObjectId(A) }]))
      .mockReturnValueOnce(
        findMock([
          { fromDoctorId: new Types.ObjectId(B) },
          { fromDoctorId: new Types.ObjectId(C) },
        ]),
      );
    const res = await service.findReferrers(B, 2);
    expect(res.depth1).toEqual([A]);
    expect(res.depth2).toEqual([C]);
    expect(res.referrers).not.toContain(B);
  });

  it('doctor creating for another id throws 403', async () => {
    await expect(
      service.createForDoctor(A, B, ReferralReason.LabWorkup, C),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('self-referral throws 400', async () => {
    await expect(
      service.createForDoctor(A, A, ReferralReason.LabWorkup),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
