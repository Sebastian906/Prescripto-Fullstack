import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consent, ConsentDocument } from './schemas/consent.schema';
import { UpsertConsentDto } from './dto/upsert-consent.dto';

@Injectable()
export class ConsentService {
  constructor(
    @InjectModel(Consent.name) private readonly model: Model<ConsentDocument>,
  ) {}

  upsert(userId: string, dto: UpsertConsentDto): Promise<ConsentDocument> {
    return this.model
      .findOneAndUpdate(
        { userId, scope: dto.scope, version: dto.version },
        { $set: { status: dto.status } },
        { new: true, upsert: true },
      )
      .exec();
  }

  mine(userId: string): Promise<ConsentDocument[]> {
    return this.model.find({ userId }).lean().exec();
  }

  async getOwned(userId: string, id: string): Promise<ConsentDocument> {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Consent not found');
    if (doc.userId !== userId) throw new ForbiddenException('Not your consent');
    return doc;
  }

  // latest consent action for the scope wins
  async hasGrantedScope(userId: string, scope: string): Promise<boolean> {
    const latest = await this.model
      .findOne({ userId, scope })
      .sort({ updatedAt: -1, _id: -1 })
      .lean()
      .exec();
    return latest?.status === 'granted';
  }
}
