# NOTIFICATIONS — Transactional Outbox (design only)

> Source of truth for the notification outbox design. Tracked document.
> Spanish mirror: `NOTIFICATIONS-ES.md`.

## Status: design only (no worker)

We design — but do **not** build — a transactional `outbox` collection written
inside the appointment transaction. Today a "notification" is a log line; there
is **no** `Notification` entity and **no** queue producer. No event bus, message
queue, or Redis exists in the runtime stack yet.

The Mongoose writer and its unit test ship now. The **worker stays out of scope**.

## Collection: `outbox`

| field          | type                                      | notes                                      |
|----------------|-------------------------------------------|--------------------------------------------|
| `event`        | `'booked' \| 'cancelled' \| 'completed'`  | required, enum                             |
| `payload`      | object                                    | **IDs + timestamps only** — never clinical |
| `dispatchedAt` | `Date \| null`                            | `null` = pending; set by the future worker |
| `createdAt`    | `Date`                                    | default `now`; FIFO order for the worker   |

Index: `{ dispatchedAt: 1, createdAt: 1 }` (undispatched poll).

### Why a transaction?

An outbox row must commit **atomically** with the appointment it describes.
`AppointmentsService.bookAppointment` and `cancelAppointment` already run inside
`session.withTransaction()` and the primary MongoDB is Atlas `mongodb+srv` (a
replica set), so the writer accepts the same `ClientSession`. If MongoDB were
ever a standalone (no replica set), transactions would fail at runtime.

## Event catalog

Payloads carry identifiers and timestamps only. Names, diagnosis, clinical
notes, reason for visit, etc. are **forbidden** in this collection.

### `booked`
Emitted inside the `bookAppointment` transaction, after the appointment insert.

    {
      "appointmentId": "<Appointment._id as string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "scheduledAt": "<ISO date>",
      "createdAt": "<ISO date>"
    }

`scheduledAt` is derived at hook time from the appointment's `slotDate` plus
`slotTime` (the schema stores them separately).

### `cancelled`
Emitted inside the `cancelAppointment` transaction, after the status update.

    {
      "appointmentId": "<Appointment._id as string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "cancelledAt": "<ISO date>"
    }

### `completed`
Emitted by the doctors module (`completeAppointment`).

    {
      "appointmentId": "<Appointment._id as string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "completedAt": "<ISO date>"
    }

## Hook points (future — NOT implemented in this change)

- `booked` — `backend/src/appointments/appointments.service.ts`, inside
  `withTransaction`, after `appointmentModel.create` (~L125-143).
- `cancelled` — `backend/src/appointments/appointments.service.ts`, inside
  `withTransaction`, after `findByIdAndUpdate` (~L207).
- `completed` — `backend/src/doctors/doctors.service.ts`, in
  `completeAppointment` (~L107-130).

Reporting is already called **after** the transaction (best-effort). Mirror that
pattern: call `outbox.append(...)` **inside** the transaction; never call the
notifier inline.

## Not building the worker now

The worker (poll, claim, send, retry/DLQ) is intentionally deferred. Do not
build it opportunistically.

## Phase 4 trigger

Build the worker when **Redis is available in the infrastructure AND** at least
one of these holds:

- Reminders are required (e.g. a T-24h appointment reminder).
- Event volume makes inline dispatch risky or unobservable.

Until then, outbox rows simply accumulate as an audit of intent.

## Risks

- Standalone MongoDB (no replica set) breaks `withTransaction` — document before
  any environment change.
- `payload` is a Mongoose `Mixed` field: its shape is enforced at compile time by
  the `Outbox` port types in `backend/src/shared/ports/outbox.port.ts`. Keep a
  guard so clinical text can never be added.

## Files

- `backend/src/shared/ports/outbox.port.ts`
- `backend/src/notifications/schemas/outbox-event.schema.ts`
- `backend/src/notifications/outbox.mongoose.adapter.ts`
- `backend/src/notifications/notifications.module.ts`
- `backend/src/tests/outbox-writer.spec.ts`