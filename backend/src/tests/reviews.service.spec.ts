import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from 'src/reviews/reviews.service';

const USER_ID = '64f1a2b3c4d5e6f7a8b9c0a1';
const OTHER_USER_ID = '64f1a2b3c4d5e6f7a8b9c0a2';
const DOCTOR_ID = '64f1a2b3c4d5e6f7a8b9c0b1';
const APPOINTMENT_ID = '64f1a2b3c4d5e6f7a8b9c0c1';
const REVIEW_ID = '64f1a2b3c4d5e6f7a8b9c0d1';
const DAY_MS = 24 * 60 * 60 * 1000;

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    _id: REVIEW_ID,
    doctorId: DOCTOR_ID,
    userId: USER_ID,
    appointmentId: APPOINTMENT_ID,
    score: 5,
    comment: 'Excelente atención',
    createdAt: new Date(Date.now() - DAY_MS),
    ...overrides,
  };
}

function buildHarness() {
  const session = {
    withTransaction: jest.fn((cb: () => Promise<void>) => cb()),
    endSession: jest.fn(() => Promise.resolve(undefined)),
  };
  const connection = { startSession: jest.fn(() => Promise.resolve(session)) };

  let currentReview: Record<string, unknown> | null = null;
  let createdReview: Record<string, unknown> | null = makeReview();
  let updateResult: Record<string, unknown> | null = null;
  let createError: Error | null = null;
  let currentStats: { count: number; sum: number } | null = null;

  const reviewModel = {
    create: jest.fn(() => {
      if (createError) return Promise.reject(createError);
      return Promise.resolve([createdReview]);
    }),
    findOne: jest.fn(() => ({
      session: () => ({ lean: () => Promise.resolve(currentReview) }),
      lean: () => Promise.resolve(currentReview),
    })),
    findOneAndUpdate: jest.fn(() => Promise.resolve(updateResult)),
    deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  };

  const statsModel = {
    updateOne: jest.fn(() => Promise.resolve({ acknowledged: true })),
    findOne: jest.fn(() => ({
      lean: () => Promise.resolve(currentStats),
    })),
  };

  const appointmentsService = {
    getReviewableAppointment: jest.fn(() =>
      Promise.resolve({
        appointmentId: APPOINTMENT_ID,
        doctorId: DOCTOR_ID,
      }),
    ),
  };

  const cacheService = { invalidatePrefix: jest.fn() };

  const service = new ReviewsService(
    reviewModel as any,
    statsModel as any,
    connection as any,
    appointmentsService as any,
    cacheService as any,
  );

  return {
    service,
    session,
    reviewModel,
    statsModel,
    appointmentsService,
    cacheService,
    setCurrentReview: (review: Record<string, unknown> | null) => {
      currentReview = review;
    },
    setCreatedReview: (review: Record<string, unknown> | null) => {
      createdReview = review;
    },
    setUpdateResult: (review: Record<string, unknown> | null) => {
      updateResult = review;
    },
    setCreateError: (err: Error | null) => {
      createError = err;
    },
    setCurrentStats: (stats: { count: number; sum: number } | null) => {
      currentStats = stats;
    },
  };
}

describe('ReviewsService', () => {
  let harness: ReturnType<typeof buildHarness>;

  beforeEach(() => {
    harness = buildHarness();
  });

  it('creates a review and increments the doctor stats', async () => {
    const result = await harness.service.create(USER_ID, {
      appointmentId: APPOINTMENT_ID,
      score: 5,
      comment: 'Excelente atención',
    });

    expect(result.review).toMatchObject({
      doctorId: DOCTOR_ID,
      appointmentId: APPOINTMENT_ID,
      score: 5,
      comment: 'Excelente atención',
    });
    expect(harness.statsModel.updateOne).toHaveBeenCalledWith(
      { doctorId: DOCTOR_ID },
      { $inc: { count: 1, sum: 5 } },
      expect.objectContaining({ upsert: true }),
    );
    expect(harness.cacheService.invalidatePrefix).toHaveBeenCalledWith(
      `doctors:rating:${DOCTOR_ID}`,
    );
  });

  it('rejects a write without an authenticated user (403)', async () => {
    await expect(
      harness.service.create('', {
        appointmentId: APPOINTMENT_ID,
        score: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      harness.appointmentsService.getReviewableAppointment,
    ).not.toHaveBeenCalled();
  });

  it('returns 404 when the appointment does not exist', async () => {
    harness.appointmentsService.getReviewableAppointment.mockRejectedValueOnce(
      new NotFoundException('Appointment not found'),
    );

    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 403 on a cross-patient write', async () => {
    harness.appointmentsService.getReviewableAppointment.mockRejectedValueOnce(
      new ForbiddenException('Not your appointment'),
    );

    await expect(
      harness.service.create(OTHER_USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 400 when the appointment is not completed', async () => {
    harness.appointmentsService.getReviewableAppointment.mockRejectedValueOnce(
      new BadRequestException('Appointment is not completed'),
    );

    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps a duplicate appointmentId (E11000) to 409', async () => {
    harness.setCreateError(
      Object.assign(new Error('duplicate key'), { code: 11000 }),
    );

    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('edits a review inside the 7-day window', async () => {
    harness.setCurrentReview(makeReview({ score: 3, comment: 'ok' }));
    harness.setUpdateResult(makeReview({ score: 5, comment: 'mucho mejor' }));

    const result = await harness.service.update(USER_ID, REVIEW_ID, {
      score: 5,
      comment: 'mucho mejor',
    });

    expect(result.review.score).toBe(5);
    expect(harness.statsModel.updateOne).toHaveBeenCalledWith(
      { doctorId: DOCTOR_ID },
      { $inc: { sum: 2 } },
      expect.objectContaining({}),
    );
  });

  it('rejects an edit after 7 days (400)', async () => {
    harness.setCurrentReview(
      makeReview({ createdAt: new Date(Date.now() - 8 * DAY_MS) }),
    );

    await expect(
      harness.service.update(USER_ID, REVIEW_ID, { score: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.reviewModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a score outside 1..5 (400)', async () => {
    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a comment with an email (400)', async () => {
    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
        comment: 'escríbeme a paciente@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a comment with a phone number (400)', async () => {
    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
        comment: 'llámame al 555 123 4567',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a comment with a diagnosis keyword (400)', async () => {
    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
        comment: 'tengo diabetes tipo 2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a comment longer than 500 characters (400)', async () => {
    await expect(
      harness.service.create(USER_ID, {
        appointmentId: APPOINTMENT_ID,
        score: 5,
        comment: 'x'.repeat(501),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only avgScore and reviewCount for the public aggregate', async () => {
    harness.setCurrentStats({ count: 2, sum: 9 });

    const result = await harness.service.getDoctorRating(DOCTOR_ID);

    expect(result).toEqual({ avgScore: 4.5, reviewCount: 2 });
    expect(Object.keys(result).sort()).toEqual(['avgScore', 'reviewCount']);
    expect(JSON.stringify(result)).not.toContain(USER_ID);
    expect(JSON.stringify(result)).not.toContain(APPOINTMENT_ID);
  });

  it('decrements the stats when a review is deleted inside the window', async () => {
    harness.setCurrentReview(makeReview({ score: 4 }));

    await harness.service.remove(USER_ID, REVIEW_ID);

    expect(harness.reviewModel.deleteOne).toHaveBeenCalledWith(
      { _id: REVIEW_ID },
      expect.objectContaining({}),
    );
    expect(harness.statsModel.updateOne).toHaveBeenCalledWith(
      { doctorId: DOCTOR_ID },
      { $inc: { count: -1, sum: -4 } },
      expect.objectContaining({}),
    );
  });

  it('prevents another patient from reading the review (403)', async () => {
    harness.setCurrentReview(makeReview());

    await expect(
      harness.service.getByAppointment(OTHER_USER_ID, APPOINTMENT_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
