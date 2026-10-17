import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OutboxEventName } from 'src/shared/ports/outbox.port';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

export interface InAppNotificationInput {
  userId: string;
  type: OutboxEventName;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

// Canal in-app: NO implementa el puerto Notifier (ese puerto es de forma
// email). Escribe una fila en el buzon del usuario dentro del pipeline.
@Injectable()
export class InAppNotificationsAdapter {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async send(input: InAppNotificationInput): Promise<void> {
    await this.model.create({ ...input, readAt: null });
  }
}
