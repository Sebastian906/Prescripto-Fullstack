import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type DoctorDocument = HydratedDocument<Doctor>;

@Schema({ minimize: false })
export class Doctor {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true, default: '' })
    image: string;

    @Prop({ required: true })
    speciality: string;

    @Prop({ required: true })
    degree: string;

    @Prop({ required: true })
    experience: string;

    @Prop({ required: true })
    about: string;

    @Prop({ default: true })
    available: boolean;

    @Prop({ required: true })
    fees: number;

    @Prop({ required: true, type: Object })
    address: {
        line1: string;
        line2: string;
    };

    @Prop({ required: true, default: Date.now })
    date: number;

    @Prop({ type: Object, default: {} })
    slots_booked: Record<string, string[]>;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);