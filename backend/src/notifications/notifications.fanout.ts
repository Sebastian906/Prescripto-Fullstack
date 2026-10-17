import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  OutboxEventMap,
  OutboxEventName,
  OutboxEventRecord,
} from 'src/shared/ports/outbox.port';
import { NOTIFIER } from 'src/shared/ports/notifier.port';
import type { Notifier } from 'src/shared/ports/notifier.port';
import { InAppNotificationsAdapter } from './in-app.adapter';
import {
  idsOnlyPayload,
  NOTIFICATION_CATALOG,
  NotificationChannel,
} from './notifications.catalog';

// Pipeline unico de fan-out de notificaciones (Fase 3, PRE-WORKER).

// NO hay worker ni push en tiempo real todavia. La entrega es best-effort y se
// dispara DESPUES de la transaccion de la cita (mismo patron que
// ReportsService.onAppointmentBooked), nunca dentro de ella. Cuando exista el
// worker del outbox (Fase 4) este servicio pasa a invocarse desde el worker,
// que ademas sella dispatchedAt; el contrato dispatch() no cambia.

// Gatillo Fase 4 (ver docs/NOTIFICATIONS.md): Redis en infra Y (recordatorios
// T-24h requeridos O el volumen hace riesgoso/opaco el inline).

// El payload de entrada es IDs + timestamps (OutboxEventRecord). El email de
// destino es un dato de ENTREGA resuelto por el caller tras la tx: nunca se
// persiste en el outbox ni en la notificacion.
@Injectable()
export class NotificationsFanout {
  private readonly logger = new Logger(NotificationsFanout.name);

  constructor(
    @Inject(NOTIFIER) private readonly notifier: Notifier,
    private readonly inApp: InAppNotificationsAdapter,
  ) {}

  async dispatch(
    record: OutboxEventRecord,
    recipientEmail: string,
  ): Promise<void> {
    const { event, payload } = record;
    const template = NOTIFICATION_CATALOG[event];
    const data = idsOnlyPayload(event, payload);

    const deliveries: Array<{
      channel: NotificationChannel;
      run: Promise<void>;
    }> = [];

    if (template.channels.includes('in-app')) {
      deliveries.push({
        channel: 'in-app',
        run: this.inApp.send({
          userId: payload.patientId,
          type: event,
          title: template.title,
          body: template.body,
          data,
        }),
      });
    }

    if (template.channels.includes('email') && recipientEmail) {
      deliveries.push({
        channel: 'email',
        run: this.notifier.notify({
          to: recipientEmail,
          subject: template.title,
          html: this.renderHtml(template.title, template.body),
        }),
      });
    }

    // Best-effort: un canal caido no debe tumbar al otro ni al request.
    const settled = await Promise.allSettled(deliveries.map((d) => d.run));
    settled.forEach((result, i) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `notification ${deliveries[i].channel} failed for event=${event}`,
        );
      }
    });
  }

  // Envoltorio best-effort para los productores (hooks de citas): arma el
  // OutboxEventRecord, corta si no hay email de entrega y NUNCA propaga al
  // request. Centraliza el try/catch para no duplicarlo en cada hook.
  async dispatchSafe(
    event: OutboxEventName,
    payload: OutboxEventMap[OutboxEventName],
    recipientEmail: string,
  ): Promise<void> {
    try {
      await this.dispatch(
        { event, payload, dispatchedAt: null, createdAt: new Date() },
        recipientEmail,
      );
    } catch (err) {
      this.logger.warn(
        `notification dispatch failed for event=${event}: ${String(err)}`,
      );
    }
  }

  private renderHtml(title: string, body: string): string {
    return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto"><h2 style="color:#6366f1">${title}</h2><p>${body}</p></div>`;
  }
}
