# NOTIFICATIONS — Transactional Outbox + Notification inbox

> Source of truth for the notification outbox design. Tracked document.
> Spanish mirror: `NOTIFICATIONS-ES.md`.

## Status: pre-worker (no worker, no realtime push)

The transactional `outbox` collection is written inside the appointment
transaction. A future worker (Phase 4, Redis) drains undispatched rows. The
**worker stays out of scope**.

Phase 3 (this change) adds the delivery side **before** the worker exists:

- `Notifier` port implemented by an SMTP adapter (`notifier.smtp.adapter.ts`).
- In-app channel: `notification` collection + inbox REST API (`NotificationsModule`).
- Fan-out pipeline (`NotificationsFanout`) driven by the outbox event catalog.
- Producers wired: the three events are emitted from the appointment hooks (see
  *Hook points*), with `booked`/`cancelled` atomic and `completed` best-effort.

Delivery is **best-effort, after** the transaction (mirrors
`ReportsService.onAppointmentBooked`). Phase 4 swaps the inline call for the
worker; the `dispatch(record, recipientEmail)` contract does not change.

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

`DoctorsService.completeAppointment` is the exception: it opens **no**
transaction, so its `completed` row is best-effort and **not atomic** (see
*Hook points*).

## Collection: `notifications`

Per-user in-app inbox.

| field       | type                                      | notes                              |
|-------------|-------------------------------------------|------------------------------------|
| `userId`    | string                                    | recipient (patient)                |
| `type`      | `'booked' \| 'cancelled' \| 'completed'`  | source event name                  |
| `title`     | string                                    | static copy from the catalog       |
| `body`      | string                                    | static copy from the catalog       |
| `data`      | object                                    | **IDs + timestamps only**          |
| `readAt`    | `Date \| null`                            | `null` = unread                    |
| `createdAt` | `Date`                                    | timestamps: true                   |

Index: `{ userId: 1, createdAt: -1 }` (inbox listing).

`data` is projected with `OUTBOX_PAYLOAD_KEYS` (`idsOnlyPayload`), so the same
runtime allowlist that protects the outbox protects the inbox: extra keys,
including clinical text, are dropped.

## Event catalog

Payloads carry identifiers and timestamps only. Names, diagnosis, clinical
notes, reason for visit, etc. are **forbidden** in both collections.

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
`slotTime` via `slotDateTime`
(`backend/src/shared/utils/slot-generator.util.ts`).

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

## Fan-out catalog

`backend/src/notifications/notifications.catalog.ts` maps each event to its
channels (`in-app`, `email`) and its **static** copy. The copy depends only on
the event type — never on patient data — so no clinical text can leak.

## Hook points (implemented — pre-worker)

- `booked` — `backend/src/appointments/appointments.service.ts`, inside
  `withTransaction`, after `appointmentModel.create`. Row is **atomic** with the
  appointment.
- `cancelled` — `backend/src/appointments/appointments.service.ts`, inside
  `withTransaction`, after the status update. Row is **atomic**.
- `completed` — `backend/src/doctors/doctors.service.ts`, in
  `completeAppointment`. The method has **no transaction**, so the row is
  best-effort and **not atomic** (committed after the status update). Wrap it in
  `withTransaction` when the Phase 4 worker needs strict atomicity.

Delivery mirrors `ReportsService`: `outbox.append(...)` runs **inside** the
transaction (where one exists) and `NotificationsFanout.dispatchSafe(...)` runs
**after** it with the delivery email the caller already has — never the notifier
inline. `dispatchSafe` never propagates to the request (a down channel cannot
break booking/cancel/complete).

## Not building the worker now

The worker (poll, claim, send, retry/DLQ) is intentionally deferred. Do not
build it opportunistically. WebSocket push and read receipts are likewise out
of scope.

## Phase 4 trigger

Build the worker when **Redis is available in the infrastructure AND** at least
one of these holds:

- Reminders are required (e.g. a T-24h appointment reminder).
- Event volume makes inline dispatch risky or unobservable.

Until then, outbox rows simply accumulate as an audit of intent, and delivery
runs best-effort from the fan-out.

## Risks

- Standalone MongoDB (no replica set) breaks `withTransaction` — document before
  any environment change.
- The `completed` row is not atomic (no transaction in `completeAppointment`).
  Acceptable pre-worker (the row is an audit of intent); revisit in Phase 4.
- `payload` / `data` are Mongoose `Mixed` fields: their shape is enforced at
  compile time by the port types and at runtime by `assertSafeOutboxPayload` /
  `idsOnlyPayload` (`backend/src/shared/ports/outbox.port.ts`). Extra keys,
  including clinical text, throw or are dropped.

## Files

- `backend/src/shared/ports/outbox.port.ts`
- `backend/src/shared/ports/notifier.port.ts`
- `backend/src/notifications/schemas/outbox-event.schema.ts`
- `backend/src/notifications/schemas/notification.schema.ts`
- `backend/src/notifications/outbox.mongoose.adapter.ts`
- `backend/src/notifications/notifier.smtp.adapter.ts`
- `backend/src/notifications/in-app.adapter.ts`
- `backend/src/notifications/notifications.catalog.ts`
- `backend/src/notifications/notifications.fanout.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/notifications.controller.ts`
- `backend/src/notifications/notifications.module.ts`
- `backend/src/shared/utils/slot-generator.util.ts`
- `backend/src/appointments/appointments.service.ts` (producer)
- `backend/src/doctors/doctors.service.ts` (producer)
- `backend/src/tests/outbox-writer.spec.ts`
- `backend/src/tests/notifications-fanout.spec.ts`
- `backend/src/tests/slot-datetime.spec.ts`