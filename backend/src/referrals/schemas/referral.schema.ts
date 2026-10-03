import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReferralDocument = HydratedDocument<Referral>;

@Schema({ timestamps: true })
export class Referral {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  fromDoctorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  toDoctorId!: Types.ObjectId;

  @Prop({ required: true })
  reason!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);

// AC rendimiento: BFS reversa "who refers to X" filtra por destino.
ReferralSchema.index({ toDoctorId: 1 });
// Listado forward GET /from/:id.
ReferralSchema.index({ fromDoctorId: 1 });
// Par ordenado: búsquedas de duplicados y conteos por arista.
ReferralSchema.index({ fromDoctorId: 1, toDoctorId: 1 });
