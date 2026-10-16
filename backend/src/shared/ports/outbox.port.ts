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

// session is opaque on purpose (same as AvailabilityRepository): the adapter
// casts it to ClientSession, keeping this port free of Mongoose imports.
export interface Outbox {
  append<E extends OutboxEventName>(
    event: E,
    payload: OutboxEventMap[E],
    session?: unknown,
  ): Promise<void>;
  findUndispatched(limit?: number): Promise<OutboxEventRecord[]>;
}

export const OUTBOX = Symbol('Outbox');