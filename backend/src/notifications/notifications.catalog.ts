import {
  OUTBOX_PAYLOAD_KEYS,
  OutboxEventMap,
  OutboxEventName,
} from 'src/shared/ports/outbox.port';

export type NotificationChannel = 'in-app' | 'email';

export interface NotificationTemplate {
  title: string;
  body: string;
  channels: readonly NotificationChannel[];
}

// Catalogo outbox -> canales + copy. El copy es ESTATICO y depende solo del
// TIPO de evento, nunca de datos del paciente: no hay texto clinico posible
// aqui, igual que en el catalogo del outbox (docs/NOTIFICATIONS.md).
export const NOTIFICATION_CATALOG: Record<
  OutboxEventName,
  NotificationTemplate
> = {
  booked: {
    title: 'Cita reservada',
    body: 'Tu cita se reservo correctamente.',
    channels: ['email', 'in-app'],
  },
  cancelled: {
    title: 'Cita cancelada',
    body: 'Tu cita fue cancelada.',
    channels: ['email', 'in-app'],
  },
  completed: {
    title: 'Cita completada',
    body: 'Tu cita se marco como completada.',
    channels: ['email', 'in-app'],
  },
  paid: {
    title: 'Cita pagada',
    body: 'El pago de tu cita se registro correctamente.',
    channels: ['email', 'in-app'],
  },
};

// Proyeccion IDs + timestamps: reutiliza la allowlist del outbox para que lo
// persistido en la notificacion no admita claves extra ni texto clinico. La
// regla vive en el puerto del outbox, no en este modulo (DRY).
export function idsOnlyPayload<E extends OutboxEventName>(
  event: E,
  payload: OutboxEventMap[E],
): Record<string, unknown> {
  const source = payload as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of OUTBOX_PAYLOAD_KEYS[event]) {
    const value = source[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
