import { AvailabilityRepository } from '../shared/ports/availability-repository.port';
import { Notifier } from '../shared/ports/notifier.port';

// Minimal consumer used only to prove the ports are mockable without Mongoose.
// Real modules (Availability / Waitlist / Notification) inject the same way
// via @Inject(AVAILABILITY_REPOSITORY) / @Inject(NOTIFIER).
async function bookAndNotify(
  repo: AvailabilityRepository,
  notifier: Notifier,
  doctorId: string,
  rawDate: string,
  slotTime: string,
  email: string,
): Promise<boolean> {
  const res = await repo.claimSlot(doctorId, rawDate, slotTime);
  if (!res.claimed) return false;
  await notifier.notify({
    to: email,
    subject: 'Slot reserved',
    html: `<p>Reserved ${rawDate} ${slotTime}</p>`,
  });
  return true;
}

describe('shared ports contract (mocked, no Mongoose)', () => {
  it('claimed slot triggers one notification', async () => {
    const repo: AvailabilityRepository = {
      claimSlot: jest.fn().mockResolvedValue({ claimed: true }),
      releaseSlot: jest.fn().mockResolvedValue(undefined),
      getBookedSlots: jest.fn().mockResolvedValue([]),
    };
    const notifyMock = jest.fn().mockResolvedValue(undefined);
    const notifier: Notifier = { notify: notifyMock };
    const ok = await bookAndNotify(
      repo,
      notifier,
      'doc1',
      '5_11_2026',
      '02:30 PM',
      'a@test.com',
    );
    expect(ok).toBe(true);
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@test.com' }),
    );
  });

  it('taken/capped slot sends nothing', async () => {
    const repo: AvailabilityRepository = {
      claimSlot: jest
        .fn()
        .mockResolvedValue({ claimed: false, reason: 'taken' }),
      releaseSlot: jest.fn().mockResolvedValue(undefined),
      getBookedSlots: jest.fn().mockResolvedValue(['02:30 PM']),
    };
    const notifyMock = jest.fn().mockResolvedValue(undefined);
    const notifier: Notifier = { notify: notifyMock };
    const ok = await bookAndNotify(
      repo,
      notifier,
      'doc1',
      '5_11_2026',
      '02:30 PM',
      'a@test.com',
    );
    expect(ok).toBe(false);
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
