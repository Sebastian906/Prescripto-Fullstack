import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditEntry {
  actorId: string;
  role: string;
  action: string;
  entityId: string;
  at?: Date;
  meta?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>,
  ) {}

  async record(entry: AuditEntry): Promise<AuditLogDocument> {
    return this.model.create({ ...entry, at: entry.at ?? new Date() });
  }

  async findByEntity(entityId: string): Promise<AuditLogDocument[]> {
    return this.model.find({ entityId }).sort({ at: -1 }).lean().exec();
  }
}
