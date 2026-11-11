import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewStatsDocument = HydratedDocument<ReviewStats>;

@Schema()
export class ReviewStats {
  @Prop({ required: true, unique: true, index: true })
  doctorId!: string;

  @Prop({ default: 0 })
  count!: number;

  @Prop({ default: 0 })
  sum!: number;
}

export const ReviewStatsSchema = SchemaFactory.createForClass(ReviewStats);
