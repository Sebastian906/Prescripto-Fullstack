import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({ minimize: false })
export class Appointment {
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    docId: string;

    @Prop({ required: true })
    slotDate: string;

    @Prop({ required: true })
    slotTime: string;

    @Prop({ required: true, type: Object })
    userData: Record<string, any>;

    @Prop({ required: true, type: Object })
    docData: Record<string, any>;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true, default: Date.now })
    date: number;

    @Prop({ default: false })
    cancelled: boolean;

    @Prop({ default: false })
    payment: boolean;

    @Prop({ default: false })
    isCompleted: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);