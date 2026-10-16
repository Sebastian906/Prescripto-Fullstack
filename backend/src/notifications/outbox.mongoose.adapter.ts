import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  Outbox,
  OutboxEventMap,
  OutboxEventName,
  OutboxEventRecord,
  assertSafeOutboxPayload,
} from 'src/shared/ports/outbox.port';
import {
  OutboxEvent,
  OutboxEventDocument,
} from './schemas/outbox-event.schema';

@Injectable()
export class OutboxMongooseAdapter implements Outbox {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEventDocument>,
  ) {}

  async append<E extends OutboxEventName>(
    event: E,
    payload: OutboxEventMap[E],
    session: unknown,
  ): Promise<void> {
    // Fail fast: never persist clinical text under a Mixed payload.
    assertSafeOutboxPayload(event, payload);

    // create([...], { session }) keeps the write inside the caller's tx.
    await this.outboxModel.create([{ event, payload, dispatchedAt: null }], {
      session: session as ClientSession | undefined,
    });
  }

  async findUndispatched(limit = 100): Promise<OutboxEventRecord[]> {
    return this.outboxModel
      .find({ dispatchedAt: null })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  }
}
