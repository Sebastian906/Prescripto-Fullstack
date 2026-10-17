import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { OutboxEventName } from 'src/shared/ports/outbox.port';

export type NotificationDocument = HydratedDocument<Notification>;

// Buzon por usuario. `data` = IDs + timestamps unicamente (proyeccion del
// payload del outbox). Sin texto clinico. `readAt: null` = no leida.
@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ required: true })
  userId!: string;

  // `type: String` explicito: una union (OutboxEventName) refleja como
  // design:type Object y @nestjs/mongoose lo rechaza sin tipo concreto.
  @Prop({
    required: true,
    type: String,
    enum: ['booked', 'cancelled', 'completed', 'paid'],
  })
  type!: OutboxEventName;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ required: true, type: Object })
  data!: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Inbox: listado por usuario mas reciente primero. El compuesto cubre el
// prefijo userId, asi que no hace falta un indice suelto para userId.
NotificationSchema.index({ userId: 1, createdAt: -1 });
