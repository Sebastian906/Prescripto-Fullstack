import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SpecialityDocument = HydratedDocument<Speciality>;

@Schema({ timestamps: true })
export class Speciality {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ required: true, unique: true, lowercase: true })
    slug: string;

    @Prop({ type: String, default: null })
    parentId: string | null;

    @Prop({ default: '' })
    description: string;

    @Prop({ default: '' })
    iconUrl: string;

    @Prop({ default: true })
    active: boolean;
}

export const SpecialitySchema = SchemaFactory.createForClass(Speciality);

// Índice compuesto para acelerar la reconstrucción del árbol
SpecialitySchema.index({ parentId: 1, active: 1 });