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

    if (event === 'paid') {
      // One paid event per appointment. A webhook retry must not enqueue a
      // duplicate; the unique partial index backs this upsert.
      try {
        await this.outboxModel.updateOne(
          {
            event,
            'payload.appointmentId': (payload as { appointmentId: string })
              .appointmentId,
          },
          { $setOnInsert: { event, payload, dispatchedAt: null } },
          {
            upsert: true,
            session: session as ClientSession | undefined,
          },
        );
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      return;
    }

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

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
