import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

const INBOX_LIMIT = 200;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async listForUser(
    userId: string,
    unreadOnly = false,
  ): Promise<{
    success: boolean;
    notifications: NotificationDocument[];
    unreadCount: number;
  }> {
    const filter = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [page, unreadCount] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(INBOX_LIMIT)
        .lean()
        .exec(),
      this.model.countDocuments({ userId, readAt: null }).exec(),
    ]);

    let notifications = page;

    // Las no leidas mas antiguas que la pagina deben seguir siendo alcanzables
    // (si no, el badge cuenta elementos que la lista nunca muestra).
    if (!unreadOnly) {
      const pageUnread = page.filter((n) => n.readAt == null).length;
      if (unreadCount > pageUnread) {
        const seen = page.map((n) => n._id);
        const extra = await this.model
          .find({ userId, readAt: null, _id: { $nin: seen } })
          .sort({ createdAt: -1 })
          .lean()
          .exec();
        // `page` son las mas recientes; `extra` es mas antiguo, asi que
        // concatenar conserva el orden descendente.
        notifications = [...page, ...extra];
      }
    }

    return { success: true, notifications, unreadCount };
  }

  async markRead(userId: string, id: string): Promise<NotificationDocument> {
    // Idempotente: solo sella readAt si seguia sin leer.
    await this.model
      .updateOne(
        { _id: id, userId, readAt: null },
        { $set: { readAt: new Date() } },
      )
      .exec();

    const doc = await this.model.findOne({ _id: id, userId }).lean().exec();
    if (!doc) throw new NotFoundException('Notification not found');
    return doc;
  }
}
