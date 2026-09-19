import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsentDocument = HydratedDocument<Consent>;
export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'revoked';

@Schema({ collection: 'consents', timestamps: true })
export class Consent {
    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    scope!: string;

    @Prop({ required: true })
    version!: string;

    @Prop({ required: true, enum: ['pending', 'granted', 'denied', 'revoked'], default: 'pending' })
    status!: ConsentStatus;
}

export const ConsentSchema = SchemaFactory.createForClass(Consent);
ConsentSchema.index({ userId: 1, scope: 1, version: 1 }, { unique: true });