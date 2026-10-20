import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DIAGNOSIS_CODES } from '../catalog/diagnosis.catalog';

export type MedicalRecordDocument = HydratedDocument<MedicalRecord>;

@Schema({ collection: 'medical_records', timestamps: true })
export class MedicalRecord {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  doctorId!: string;

  @Prop({ required: true, unique: true, index: true })
  appointmentId!: string;

  @Prop({ required: true, enum: DIAGNOSIS_CODES })
  diagnosis!: string;

  // AES-256-GCM payload (iv:authTag:ciphertext). Never plaintext.
  @Prop({ default: '' })
  notes!: string;

  @Prop({ type: [String], default: [] })
  attachments!: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const MedicalRecordSchema = SchemaFactory.createForClass(MedicalRecord);
