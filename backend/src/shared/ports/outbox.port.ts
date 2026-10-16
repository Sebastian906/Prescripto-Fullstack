// Transactional outbox port. The Mongoose adapter (in the notifications module)
// writes rows inside the booking/cancel transaction; a future worker (Phase 4,
// Redis) drains them. Payloads are IDs + timestamps ONLY — never clinical text.
// Design doc: docs/NOTIFICATIONS.md.

export type OutboxEventName = 'booked' | 'cancelled' | 'completed';

// No patient/doctor snapshot here: identifiers only.
export interface BookedPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  createdAt: Date;
}

export interface CancelledPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  cancelledAt: Date;
}

export interface CompletedPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  completedAt: Date;
}

export interface OutboxEventMap {
  booked: BookedPayload;
  cancelled: CancelledPayload;
  completed: CompletedPayload;
}

export type OutboxPayload = OutboxEventMap[OutboxEventName];

export interface OutboxEventRecord {
  event: OutboxEventName;
  payload: OutboxPayload;
  dispatchedAt: Date | null;
  createdAt: Date;
}

// Runtime allowlist per event: enforces the IDs + timestamps-only rule.
// (TS types are erased; the Mongoose payload field is Mixed.)
export const OUTBOX_PAYLOAD_KEYS: Record<OutboxEventName, readonly string[]> = {
  booked: [
    'appointmentId',
    'patientId',
    'doctorId',
    'scheduledAt',
    'createdAt',
  ],
  cancelled: ['appointmentId', 'patientId', 'doctorId', 'cancelledAt'],
  completed: ['appointmentId', 'patientId', 'doctorId', 'completedAt'],
};

export function assertSafeOutboxPayload<E extends OutboxEventName>(
  event: E,
  payload: OutboxEventMap[E],
): void {
  const allowed = OUTBOX_PAYLOAD_KEYS[event];
  const entries = Object.entries(payload as unknown as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (!allowed.includes(key)) {
      throw new Error(`Outbox ${event} payload has unexpected key: ${key}`);
    }
    const isAllowedValue = typeof value === 'string' || value instanceof Date;
    if (!isAllowedValue) {
      throw new Error(
        `Outbox ${event} payload key ${key} must be a string or a Date`,
      );
    }
  }
}

// session is REQUIRED on purpose: an outbox row only makes sense committed
// atomically with the appointment. The adapter casts it to ClientSession,
// keeping this port free of Mongoose imports.
export interface Outbox {
  append<E extends OutboxEventName>(
    event: E,
    payload: OutboxEventMap[E],
    session: unknown,
  ): Promise<void>;
  findUndispatched(limit?: number): Promise<OutboxEventRecord[]>;
}

export const OUTBOX = Symbol('Outbox');
