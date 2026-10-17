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

    const [notifications, unreadCount] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(INBOX_LIMIT)
        .lean()
        .exec(),
      this.model.countDocuments({ userId, readAt: null }).exec(),
    ]);

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
