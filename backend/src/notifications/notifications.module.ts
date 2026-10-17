import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OUTBOX } from 'src/shared/ports/outbox.port';
import { NOTIFIER } from 'src/shared/ports/notifier.port';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';
import { OutboxMongooseAdapter } from './outbox.mongoose.adapter';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { NotifierSmtpAdapter } from './notifier.smtp.adapter';
import { InAppNotificationsAdapter } from './in-app.adapter';
import { NotificationsFanout } from './notifications.fanout';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    AuthUserModule,
  ],
  providers: [
    { provide: OUTBOX, useClass: OutboxMongooseAdapter },
    { provide: NOTIFIER, useClass: NotifierSmtpAdapter },
    InAppNotificationsAdapter,
    NotificationsFanout,
    NotificationsService,
  ],
  controllers: [NotificationsController],
  exports: [OUTBOX, NOTIFIER, NotificationsFanout, NotificationsService],
})
export class NotificationsModule {}
