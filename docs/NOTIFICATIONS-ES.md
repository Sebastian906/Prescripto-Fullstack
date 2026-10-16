# NOTIFICACIONES — Outbox transaccional (solo diseno)

> Fuente de verdad del diseno del outbox de notificaciones. Documento rastreado.
> Espejo en ingles: `NOTIFICATIONS.md`.

## Estado: solo diseno (sin worker)

Disenamos — pero **no** construimos — una coleccion `outbox` transaccional
escrita dentro de la transaccion de la cita. Hoy una "notificacion" es una linea
de log; **no** hay entidad `Notification` ni **productor** de cola. Todavia no
existe bus de eventos, cola de mensajes ni Redis en el stack de runtime.

El writer de Mongoose y su test unitario se entregan ahora. El **worker queda
fuera de alcance**.

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

## Catalogo de eventos

Los payloads llevan solo identificadores y timestamps. Nombres, diagnostico,
notas clinicas, motivo de consulta, etc. quedan **prohibidos** en esta coleccion.

### `booked`
Se emite dentro de la transaccion de `bookAppointment`, tras insertar la cita.

    {
      "appointmentId": "<Appointment._id como string>",
      "patientId": "<userId>",
      "doctorId": "<docId>",
      "scheduledAt": "<fecha ISO>",
      "createdAt": "<fecha ISO>"
    }

`scheduledAt` se deriva en el hook a partir de `slotDate` mas `slotTime` de la
cita (el schema los guarda por separado).

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

## Puntos de hook (futuro — NO implementados en este cambio)

- `booked` — `backend/src/appointments/appointments.service.ts`, dentro de
  `withTransaction`, tras `appointmentModel.create` (~L125-143).
- `cancelled` — `backend/src/appointments/appointments.service.ts`, dentro de
  `withTransaction`, tras `findByIdAndUpdate` (~L207).
- `completed` — `backend/src/doctors/doctors.service.ts`, en
  `completeAppointment` (~L107-130).

El reporting ya se llama **despues** de la transaccion (best-effort). Refleja ese
patron: llama `outbox.append(...)` **dentro** de la transaccion; nunca invoques
el notificador inline.

## No construir el worker ahora

El worker (poll, reclamo, envio, reintento/DLQ) se difiere a proposito. No
construirlo de forma oportunista.

## Gatillo de Fase 4

Construir el worker cuando **exista Redis en la infraestructura Y** se cumpla al
menos una de estas condiciones:

- Se requieren recordatorios (p. ej. recordatorio T-24h de la cita).
- El volumen de eventos hace riesgoso u opaco el despacho inline.

Hasta entonces, las filas de outbox se acumulan como registro de intencion.

## Riesgos

- MongoDB standalone (sin replica set) rompe `withTransaction` — documentar antes
  de cualquier cambio de entorno.
- `payload` es un campo `Mixed` de Mongoose: su forma se garantiza en tiempo de
  compilacion via los tipos del puerto `Outbox` en
  `backend/src/shared/ports/outbox.port.ts`. Mantener una guarda para que nunca
  se agregue texto clinico.

## Archivos

- `backend/src/shared/ports/outbox.port.ts`
- `backend/src/notifications/schemas/outbox-event.schema.ts`
- `backend/src/notifications/outbox.mongoose.adapter.ts`
- `backend/src/notifications/notifications.module.ts`
- `backend/src/tests/outbox-writer.spec.ts`