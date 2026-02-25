import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
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

    @Prop({ default: 'Not Selected' })
    gender: string;

    @Prop({ default: 'Not Selected' })
    dob: string;

    @Prop({ default: '0000000000' })
    phone: string;
}

export const UserSchema = SchemaFactory.createForClass(User);