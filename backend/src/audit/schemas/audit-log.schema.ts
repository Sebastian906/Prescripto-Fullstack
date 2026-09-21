import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'auditlogs' })
export class AuditLog {
  @Prop({ required: true })
  actorId!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true, default: Date.now })
  at!: Date;

  @Prop({ type: Object })
  meta?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ entityId: 1, at: -1 });
AuditLogSchema.index({ actorId: 1, at: -1 });
