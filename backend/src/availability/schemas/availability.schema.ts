import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AvailabilityDocument = HydratedDocument<Availability>;

@Schema({ timestamps: true, collection: 'availabilities' })
export class Availability {
  @Prop({ required: true, index: true, type: String })
  doctorId!: string;

  @Prop({
    required: true,
    type: String,
    match: /^\d{1,2}_\d{1,2}_\d{4}$/,
    description:
      'Canonical slot key D_M_YYYY (underscores, no zero-pad required)',
  })
  date!: string;

  @Prop({ required: true, type: [String], default: [] })
  slots!: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

AvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });
