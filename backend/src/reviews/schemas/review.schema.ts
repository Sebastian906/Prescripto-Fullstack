import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, index: true })
  doctorId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true, index: true })
  appointmentId!: string;

  @Prop({ required: true, min: 1, max: 5 })
  score!: number;

  @Prop({ default: '', maxlength: 500 })
  comment!: string;

  // Generados por `timestamps: true`; se declaran para tipar el DTO de salida.
  createdAt?: Date;
  updatedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
