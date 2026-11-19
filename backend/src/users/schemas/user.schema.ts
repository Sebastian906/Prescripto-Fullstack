import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GENDER_VALUES } from 'src/shared/utils/validators';
import type { Gender } from 'src/shared/utils/validators';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: '' })
  password: string;

  @Prop({ default: '' })
  image: string;

  @Prop({
    type: Object,
    default: { line1: '', line2: '' },
  })
  address: {
    line1: string;
    line2: string;
  };

  @Prop({ type: String, default: 'Unspecified', enum: [...GENDER_VALUES] })
  gender: Gender;

  @Prop({ type: String, default: null })
  dob: string | null;

  @Prop({ default: '' })
  phone: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
