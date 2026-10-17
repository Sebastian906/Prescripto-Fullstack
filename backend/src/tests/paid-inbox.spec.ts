import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';
import { NotificationsService } from '../notifications/notifications.service';

// --- paid transition (money path) -----------------------------------------

function makeAppointments(updated: unknown) {
  const appointment = {
    _id: 'a1',
    userId: 'u1',
    docId: 'd1',
    cancelled: false,
    payment: false,
    userData: { email: 'p@test.com' },
  };
  const appointmentModel = {
    findById: jest.fn().mockResolvedValue(appointment),
    findOneAndUpdate: jest.fn().mockResolvedValue(updated),
  };
  const outbox = { append: jest.fn().mockResolvedValue(undefined) };
  const fanout = { dispatchSafe: jest.fn().mockResolvedValue(undefined) };
  const svc = new AppointmentsService(
    appointmentModel as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    outbox as any,
    fanout as any,
  );
  return { svc, appointmentModel, outbox, fanout };
}

describe('payWithCOD paid transition is atomic', () => {
  it('emits paid once when the conditional update wins', async () => {
    const { svc, appointmentModel, outbox, fanout } = makeAppointments({
      _id: 'a1',
    });

    await svc.payWithCOD('u1', { appointmentId: 'a1' } as any);

    expect(appointmentModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'a1', payment: false },
      { payment: true },
    );
    expect(outbox.append).toHaveBeenCalledTimes(1);
    expect(fanout.dispatchSafe).toHaveBeenCalledTimes(1);
  });

  it('does not emit when payment was already flipped (concurrent call)', async () => {
    const { svc, outbox, fanout } = makeAppointments(null);

    await expect(
      svc.payWithCOD('u1', { appointmentId: 'a1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(outbox.append).not.toHaveBeenCalled();
    expect(fanout.dispatchSafe).not.toHaveBeenCalled();
  });
});

// --- inbox keeps old unread reachable -------------------------------------

function makeNotificationsModel(
  page: Array<{ _id: string; readAt: Date | null }>,
  unreadCount: number,
  extra: Array<{ _id: string; readAt: Date | null }>,
) {
  const chain = (result: unknown[]) => {
    const c: any = {
      sort: () => c,
      limit: () => c,
      lean: () => c,
      exec: () => Promise.resolve(result),
    };
    return c;
  };
  const find = jest.fn((filter: any) =>
    // The extra query carries `_id: { $nin: [...] }`.
    filter._id ? chain(extra) : chain(page),
  );
  const countDocuments = jest.fn(() => ({
    exec: () => Promise.resolve(unreadCount),
  }));
  return { find, countDocuments } as any;
}

describe('listForUser keeps unread beyond the page reachable', () => {
  it('merges older unread so they can be marked read', async () => {
    const model = makeNotificationsModel(
      [
        { _id: 'n1', readAt: new Date() },
        { _id: 'n2', readAt: null },
      ],
      2,
      [{ _id: 'n0', readAt: null }],
    );
    const svc = new NotificationsService(model);

    const res = await svc.listForUser('u1');

    expect(res.unreadCount).toBe(2);
    expect(res.notifications.map((n) => n._id)).toEqual(['n1', 'n2', 'n0']);
  });

  it('skips the extra query when every unread is already in the page', async () => {
    const model = makeNotificationsModel([{ _id: 'n1', readAt: null }], 1, []);
    const svc = new NotificationsService(model);

    const res = await svc.listForUser('u1');

    expect(res.notifications.map((n) => n._id)).toEqual(['n1']);
    expect(model.find).toHaveBeenCalledTimes(1);
  });
});
