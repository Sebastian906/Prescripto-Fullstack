import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Referral, ReferralDocument } from './schemas/referral.schema';
import { ReferralReason, isReferralReason } from './referrals.constants';
import { CreateReferralAdminDto } from './dto/create-referral.dto';

export interface ReferralLean {
  _id: unknown;
  fromDoctorId: unknown;
  toDoctorId: unknown;
  reason: string;
}

export interface ReferralListResponse {
  success: boolean;
  count: number;
  referrals: ReferralLean[];
}

export interface ReferralGraph {
  success: boolean;
  targetDoctorId: string;
  hops: number;
  depth1: string[];
  depth2: string[];
  totalReferrers: number;
  referrers: string[];
  truncated: boolean;
}

const BFS_LIMIT = 5000;

function assertObjectId(value: string, field: string): void {
  if (!Types.ObjectId.isValid(value)) {
    throw new BadRequestException({
      message: `Invalid ObjectId for '${field}': '${value}'`,
      code: 'INVALID_ID',
    });
  }
}

function assertReason(value: string): asserts value is ReferralReason {
  if (!isReferralReason(value)) {
    throw new BadRequestException({
      message: `Invalid referral reason: '${value}'`,
      code: 'INVALID_REASON',
    });
  }
}

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(Referral.name)
    private readonly referralModel: Model<ReferralDocument>,
  ) {}

  async createForDoctor(
    docId: string,
    toDoctorId: string,
    reason: string,
    claimedFrom?: string,
  ): Promise<{ success: boolean; id: string }> {
    assertObjectId(docId, 'fromDoctorId');
    assertObjectId(toDoctorId, 'toDoctorId');
    assertReason(reason);
    if (claimedFrom !== undefined && claimedFrom !== docId) {
      throw new ForbiddenException({
        message: 'Doctors can only create referrals for themselves',
        code: 'FORBIDDEN_REFERRAL',
      });
    }
    if (docId === toDoctorId) {
      throw new BadRequestException({
        message: 'Self-referral is not allowed',
        code: 'SELF_REFERRAL',
      });
    }
    const created = await this.referralModel.create({
      fromDoctorId: new Types.ObjectId(docId),
      toDoctorId: new Types.ObjectId(toDoctorId),
      reason,
    });
    return { success: true, id: String(created._id) };
  }

  async createForAdmin(
    dto: CreateReferralAdminDto,
  ): Promise<{ success: boolean; id: string }> {
    assertObjectId(dto.fromDoctorId, 'fromDoctorId');
    assertObjectId(dto.toDoctorId, 'toDoctorId');
    assertReason(dto.reason);
    if (dto.fromDoctorId === dto.toDoctorId) {
      throw new BadRequestException({
        message: 'Self-referral is not allowed',
        code: 'SELF_REFERRAL',
      });
    }
    const created = await this.referralModel.create({
      fromDoctorId: new Types.ObjectId(dto.fromDoctorId),
      toDoctorId: new Types.ObjectId(dto.toDoctorId),
      reason: dto.reason,
    });
    return { success: true, id: String(created._id) };
  }

  async listFrom(fromDoctorId: string): Promise<ReferralListResponse> {
    assertObjectId(fromDoctorId, 'fromDoctorId');
    const docs = (await this.referralModel
      .find({ fromDoctorId: new Types.ObjectId(fromDoctorId) })
      .limit(BFS_LIMIT)
      .lean()
      .exec()) as unknown as ReferralLean[];
    return { success: true, count: docs.length, referrals: docs };
  }

  async listTo(toDoctorId: string): Promise<ReferralListResponse> {
    assertObjectId(toDoctorId, 'toDoctorId');
    const docs = (await this.referralModel
      .find({ toDoctorId: new Types.ObjectId(toDoctorId) })
      .limit(BFS_LIMIT)
      .lean()
      .exec()) as unknown as ReferralLean[];
    return { success: true, count: docs.length, referrals: docs };
  }

  async listAll(limit = 100): Promise<ReferralListResponse> {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const docs = (await this.referralModel
      .find({})
      .limit(safeLimit)
      .lean()
      .exec()) as unknown as ReferralLean[];
    return { success: true, count: docs.length, referrals: docs };
  }

  async findReferrers(
    targetDoctorId: string,
    hops = 2,
  ): Promise<ReferralGraph> {
    assertObjectId(targetDoctorId, 'doctorId');
    if (hops !== 1 && hops !== 2) {
      throw new BadRequestException({
        message: `Invalid hops '${hops}'. Allowed: 1, 2`,
        code: 'INVALID_HOPS',
      });
    }
    const target = new Types.ObjectId(targetDoctorId);
    const visited = new Set<string>([targetDoctorId]);

    // Group by referrer before bounding: duplicate edges from the same
    // doctor must not crowd distinct referrers out of the limit.
    // One extra group probes truncation without a second query.
    const level1Groups = (await this.referralModel
      .aggregate([
        { $match: { toDoctorId: target } },
        { $group: { _id: '$fromDoctorId' } },
        { $limit: BFS_LIMIT + 1 },
      ])
      .exec()) as unknown as Array<{ _id: unknown }>;
    const depth1: string[] = [];
    for (const group of level1Groups.slice(0, BFS_LIMIT)) {
      const id = String(group._id);
      if (!visited.has(id)) {
        visited.add(id);
        depth1.push(id);
      }
    }
    let truncated = level1Groups.length > BFS_LIMIT;

    const depth2: string[] = [];
    if (hops === 2 && depth1.length > 0) {
      const level1Oids = depth1.map((id) => new Types.ObjectId(id));
      const level2Groups = (await this.referralModel
        .aggregate([
          { $match: { toDoctorId: { $in: level1Oids } } },
          { $group: { _id: '$fromDoctorId' } },
          { $limit: BFS_LIMIT + 1 },
        ])
        .exec()) as unknown as Array<{ _id: unknown }>;
      for (const group of level2Groups.slice(0, BFS_LIMIT)) {
        const id = String(group._id);
        if (!visited.has(id)) {
          visited.add(id);
          depth2.push(id);
        }
      }
      truncated = truncated || level2Groups.length > BFS_LIMIT;
    }

    return {
      success: true,
      targetDoctorId,
      hops,
      depth1,
      depth2,
      totalReferrers: depth1.length + depth2.length,
      referrers: [...depth1, ...depth2],
      truncated,
    };
  }
}
