import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OUTBOX } from 'src/shared/ports/outbox.port';
import { OutboxMongooseAdapter } from './outbox.mongoose.adapter';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';

// Design-only module: no controller, no worker (Phase 4). Exposes the OUTBOX
// port so a future hook in AppointmentsService can write inside its tx.
// Register this module in AppModule only when that hook lands.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
    ]),
  ],
  providers: [{ provide: OUTBOX, useClass: OutboxMongooseAdapter }],
  exports: [OUTBOX],
})
export class NotificationsModule {}
