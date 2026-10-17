# NOTIFICACIONES — Outbox transaccional + buzon de notificaciones

> Fuente de verdad del diseno del outbox de notificaciones. Documento rastreado.
> Espejo en ingles: `NOTIFICATIONS.md`.

## Estado: pre-worker (sin worker, sin push en tiempo real)

La coleccion `outbox` transaccional se escribe dentro de la transaccion de la
cita. Un worker futuro (Fase 4, Redis) drena las filas no distribuidas. El
**worker queda fuera de alcance**.

La Fase 3 (este cambio) agrega el lado de entrega **antes** de que exista el
worker:

- Puerto `Notifier` implementado por un adaptador SMTP (`notifier.smtp.adapter.ts`).
- Canal in-app: coleccion `notification` + API REST de buzon (`NotificationsModule`).
- Pipeline de fan-out (`NotificationsFanout`) guiado por el catalogo de eventos.
- Productores cableados: los tres eventos se emiten desde los hooks de citas
  (ver *Puntos de hook*), con `booked`/`cancelled` atomicos y `completed`
  best-effort.

La entrega es **best-effort, despues** de la transaccion (refleja
`ReportsService.onAppointmentBooked`). La Fase 4 cambia la llamada inline por el
worker; el contrato `dispatch(record, recipientEmail)` no cambia.

## Coleccion: `outbox`

| campo          | tipo                                      | notas                                          |
|----------------|-------------------------------------------|------------------------------------------------|
| `event`        | `'booked' \| 'cancelled' \| 'completed'`  | requerido, enum                                |
| `payload`      | objeto                                    | **solo IDs + timestamps** — nunca texto clinico |
| `dispatchedAt` | `Date \| null`                            | `null` = pendiente; lo setea el worker futuro  |
| `createdAt`    | `Date`                                    | default `now`; orden FIFO para el worker       |

Indice: `{ dispatchedAt: 1, createdAt: 1 }` (poll de no-distribuidos).

### Por que una transaccion?

Una fila de outbox debe commitear **atomicamente** con la cita que describe.
`AppointmentsService.bookAppointment` y `cancelAppointment` ya corren dentro de
`session.withTransaction()` y la base primaria es Atlas `mongodb+srv` (replica
set), por lo que el writer acepta la misma `ClientSession`. Si MongoDB fuera
standalone (sin replica set), las transacciones fallarian en runtime.

`DoctorsService.completeAppointment` es la excepcion: **no** abre transaccion,
asi que su fila `completed` es best-effort y **no atomica** (ver *Puntos de hook*).

## Coleccion: `notifications`

Buzon in-app por usuario.

| campo       | tipo                                      | notas                             |
|-------------|-------------------------------------------|-----------------------------------|
| `userId`    | string                                    | destinatario (paciente)           |
| `type`      | `'booked' \| 'cancelled' \| 'completed'`  | nombre del evento origen          |
| `title`     | string                                    | copy estatico del catalogo        |
| `body`      | string                                    | copy estatico del catalogo        |
| `data`      | objeto                                    | **solo IDs + timestamps**         |
| `readAt`    | `Date \| null`                            | `null` = no leida                 |
| `createdAt` | `Date`                                    | timestamps: true                  |

Indice: `{ userId: 1, createdAt: -1 }` (listado del buzon).

`data` se proyecta con `OUTBOX_PAYLOAD_KEYS` (`idsOnlyPayload`): la misma
allowlist runtime que protege el outbox protege el buzon. Claves extra, incluido
texto clinico, se descartan.

## Catalogo de eventos

Los payloads llevan solo identificadores y timestamps. Nombres, diagnostico,
notas clinicas, motivo de consulta, etc. quedan **prohibidos** en ambas
colecciones.

### `booked`
Se emite dentro de la transaccion de `bookAppointment`, tras insertar la cita.

    {
      "appointmentId": "<Appointment._id como string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "scheduledAt": "<fecha ISO>",
      "createdAt": "<fecha ISO>"
    }

`scheduledAt` se deriva en el hook a partir de `slotDate` mas `slotTime` via
`slotDateTime` (`backend/src/shared/utils/slot-generator.util.ts`).

### `cancelled`
Se emite dentro de la transaccion de `cancelAppointment`, tras el update de estado.

    {
      "appointmentId": "<Appointment._id como string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "cancelledAt": "<fecha ISO>"
    }

### `completed`
Se emite desde el modulo de doctores (`completeAppointment`).

    {
      "appointmentId": "<Appointment._id como string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "completedAt": "<fecha ISO>"
    }

## Catalogo de fan-out

`backend/src/notifications/notifications.catalog.ts` mapea cada evento a sus
canales (`in-app`, `email`) y su copy **estatico**. El copy depende solo del tipo
de evento — nunca de datos del paciente — asi que ningun texto clinico puede
filtrarse.

## Puntos de hook (implementados — pre-worker)

- `booked` — `backend/src/appointments/appointments.service.ts`, dentro de
  `withTransaction`, tras `appointmentModel.create`. Fila **atomica** con la cita.
- `cancelled` — `backend/src/appointments/appointments.service.ts`, dentro de
  `withTransaction`, tras el update de estado. Fila **atomica**.
- `completed` — `backend/src/doctors/doctors.service.ts`, en
  `completeAppointment`. El metodo **no** corre en transaccion, asi que la fila es
  best-effort y **no atomica** (se commitea tras el update de estado). Envolver en
  `withTransaction` cuando el worker (Fase 4) exija atomicidad estricta.

La entrega refleja `ReportsService`: `outbox.append(...)` corre **dentro** de la
transaccion (donde exista) y `NotificationsFanout.dispatchSafe(...)` corre
**despues** con el email de entrega que el caller ya tiene — nunca el notificador
inline. `dispatchSafe` nunca propaga al request (un canal caido no puede romper
reservar/cancelar/completar).

## No construir el worker ahora

El worker (poll, reclamo, envio, reintento/DLQ) se difiere a proposito. No
construirlo de forma oportunista. El push por WebSocket y los read receipts
tambien quedan fuera de alcance.

## Gatillo de Fase 4

Construir el worker cuando **exista Redis en la infraestructura Y** se cumpla al
menos una de estas condiciones:

- Se requieren recordatorios (p. ej. recordatorio T-24h de la cita).
- El volumen de eventos hace riesgoso u opaco el despacho inline.

Hasta entonces, las filas de outbox se acumulan como registro de intencion y la
entrega corre best-effort desde el fan-out.

## Riesgos

- MongoDB standalone (sin replica set) rompe `withTransaction` — documentar antes
  de cualquier cambio de entorno.
- La fila `completed` no es atomica (no hay transaccion en `completeAppointment`).
  Aceptable pre-worker (la fila es registro de intencion); revisar en la Fase 4.
- `payload` / `data` son campos `Mixed` de Mongoose: su forma se garantiza en
  tiempo de compilacion via los tipos del puerto y en runtime via
  `assertSafeOutboxPayload` / `idsOnlyPayload`
  (`backend/src/shared/ports/outbox.port.ts`). Claves extra, incluido texto
  clinico, lanzan error o se descartan.

## Archivos

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
- `backend/src/appointments/appointments.service.ts` (productor)
- `backend/src/doctors/doctors.service.ts` (productor)
- `backend/src/tests/outbox-writer.spec.ts`
- `backend/src/tests/notifications-fanout.spec.ts`
- `backend/src/tests/slot-datetime.spec.ts`