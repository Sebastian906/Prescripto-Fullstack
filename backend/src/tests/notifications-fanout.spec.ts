import { InAppNotificationsAdapter } from 'src/notifications/in-app.adapter';
import { NotificationsFanout } from 'src/notifications/notifications.fanout';
import { Notifier } from 'src/shared/ports/notifier.port';
import { OutboxEventRecord } from 'src/shared/ports/outbox.port';

function bookedRecord(): OutboxEventRecord {
  return {
    event: 'booked',
    payload: {
      appointmentId: 'a1',
      patientId: 'u1',
      doctorId: 'd1',
      scheduledAt: new Date('2026-01-01T10:00:00Z'),
      createdAt: new Date('2026-01-01T09:00:00Z'),
    },
    dispatchedAt: null,
    createdAt: new Date('2026-01-01T09:00:00Z'),
  };
}

function mockFanout(notify: jest.Mock, send: jest.Mock): NotificationsFanout {
  const notifier: Notifier = { notify };
  const inApp = { send } as unknown as InAppNotificationsAdapter;
  return new NotificationsFanout(notifier, inApp);
}

describe('NotificationsFanout (pre-worker best-effort)', () => {
  it('un evento del outbox hace fan-out a email + in-app con payload de solo IDs', async () => {
    const notify = jest.fn().mockResolvedValue(undefined);
    const send = jest.fn().mockResolvedValue(undefined);
    const fanout = mockFanout(notify, send);

    await fanout.dispatch(bookedRecord(), 'patient@test.com');

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'patient@test.com' }),
    );

    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg).toMatchObject({ userId: 'u1', type: 'booked' });
    // Solo IDs + timestamps: ni claves extra ni texto clinico.
    expect(Object.keys(arg.data).sort()).toEqual(
      [
        'appointmentId',
        'doctorId',
        'patientId',
        'scheduledAt',
        'createdAt',
      ].sort(),
    );
    expect(JSON.stringify(arg.data)).not.toMatch(
      /diagnosis|notes|reason|clinical/i,
    );
  });

  it('un canal caido no impide que el otro entregue', async () => {
    const notify = jest.fn().mockRejectedValue(new Error('smtp down'));
    const send = jest.fn().mockResolvedValue(undefined);
    const fanout = mockFanout(notify, send);

    await expect(
      fanout.dispatch(bookedRecord(), 'patient@test.com'),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(1);
  });
});
