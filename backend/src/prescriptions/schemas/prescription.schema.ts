import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PrescriptionDocument = HydratedDocument<Prescription>;

@Schema({ _id: false })
export class PrescriptionItem {
  @Prop({ required: true, trim: true })
  drug!: string;

  @Prop({ required: true, trim: true })
  dose!: string;

  @Prop({ required: true, trim: true })
  frequency!: string;

  @Prop({ required: true, min: 1, max: 365 })
  days!: number;
}

export const PrescriptionItemSchema =
  SchemaFactory.createForClass(PrescriptionItem);

@Schema({ collection: 'prescriptions', timestamps: true })
export class Prescription {
  // One prescription per E-03 record version.
  @Prop({ required: true, unique: true, index: true })
  recordId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  doctorId!: string;

  @Prop({ type: [PrescriptionItemSchema], required: true, default: [] })
  items!: PrescriptionItem[];

  @Prop({ required: true, default: Date.now })
  issuedAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);

PrescriptionSchema.index({ userId: 1, issuedAt: -1 });
PrescriptionSchema.index({ doctorId: 1, issuedAt: -1 });
