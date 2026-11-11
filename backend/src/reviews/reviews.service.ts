import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { CacheService } from 'src/shared/cache/cache.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, ReviewDocument } from './schemas/review.schema';
import {
  ReviewStats,
  ReviewStatsDocument,
} from './schemas/review-stats.schema';
import { containsPHI } from './utils/phi.util';

export const REVIEW_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_COMMENT_LENGTH = 500;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const RATING_CACHE_TTL_MS = 300_000;
const RATING_CACHE_MAX_ENTRIES = 500;

interface RatingCacheEntry {
  value: { avgScore: number; reviewCount: number };
  expiresAt: number;
}

export interface ReviewView {
  id: string;
  doctorId: string;
  appointmentId: string;
  score: number;
  comment: string;
  createdAt: Date;
}

type LeanReview = Review & { _id: Types.ObjectId | string };

/** Returns true when MongoDB reports a duplicate key (E11000). */
function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

/** Application service for patient reviews and doctor rating aggregates. */
@Injectable()
export class ReviewsService {
  private readonly ratingCache = new Map<string, RatingCacheEntry>();

  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewStats.name)
    private readonly statsModel: Model<ReviewStatsDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly appointmentsService: AppointmentsService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  /** Creates one review for a completed appointment owned by the patient. */
  async create(
    userId: string,
    dto: CreateReviewDto,
  ): Promise<{ success: true; review: ReviewView }> {
    if (!userId) throw new ForbiddenException('Authentication required');

    const score = Number(dto.score);
    const comment = dto.comment ?? '';
    this.validateScore(score);
    this.validateComment(comment);

    const appointment = await this.appointmentsService.getReviewableAppointment(
      userId,
      dto.appointmentId,
    );

    const session = await this.connection.startSession();
    let created: ReviewDocument | undefined;
    try {
      await session.withTransaction(async () => {
        const docs = await this.reviewModel.create(
          [
            {
              doctorId: appointment.doctorId,
              userId,
              appointmentId: appointment.appointmentId,
              score,
              comment,
            },
          ],
          { session },
        );
        created = docs[0];

        await this.statsModel.updateOne(
          { doctorId: appointment.doctorId },
          { $inc: { count: 1, sum: score } },
          { upsert: true, session },
        );
      });
    } catch (err) {
      if (isDuplicateKey(err)) {
        throw new ConflictException(
          'A review already exists for this appointment',
        );
      }
      throw err;
    } finally {
      await session.endSession();
    }

    if (!created) {
      throw new InternalServerErrorException('Review was not created');
    }

    this.invalidateRating(appointment.doctorId);
    return { success: true, review: this.toView(created) };
  }

  /** Updates score/comment within the 7-day window and adjusts the aggregate. */
  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<{ success: true; review: ReviewView }> {
    if (!userId) throw new ForbiddenException('Authentication required');
    // null and undefined both mean "not provided".
    if (dto.score == null && dto.comment == null) {
      throw new BadRequestException('Nothing to update');
    }
    this.assertValidId(reviewId);

    const session = await this.connection.startSession();
    let updated: ReviewDocument | null = null;
    let doctorId = '';
    try {
      await session.withTransaction(async () => {
        const review = (await this.reviewModel
          .findOne({ _id: reviewId })
          .session(session)
          .lean()) as LeanReview | null;

        if (!review) throw new NotFoundException('Review not found');
        if (review.userId !== userId) {
          throw new ForbiddenException('Not your review');
        }
        this.assertEditable(review.createdAt);
        doctorId = review.doctorId;

        const score = dto.score ?? review.score;
        const comment = dto.comment ?? review.comment;
        this.validateScore(score);
        this.validateComment(comment);

        const delta = score - review.score;
        updated = await this.reviewModel.findOneAndUpdate(
          { _id: reviewId },
          { $set: { score, comment } },
          { new: true, session },
        );
        if (!updated) throw new NotFoundException('Review not found');

        if (delta !== 0) {
          await this.statsModel.updateOne(
            { doctorId: review.doctorId },
            { $inc: { sum: delta } },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    if (!updated) throw new NotFoundException('Review not found');

    this.invalidateRating(doctorId);
    return { success: true, review: this.toView(updated) };
  }

  /** Deletes a review within the 7-day window and adjusts the aggregate. */
  async remove(userId: string, reviewId: string): Promise<{ success: true }> {
    if (!userId) throw new ForbiddenException('Authentication required');
    this.assertValidId(reviewId);

    const session = await this.connection.startSession();
    let doctorId = '';
    try {
      await session.withTransaction(async () => {
        const review = (await this.reviewModel
          .findOne({ _id: reviewId })
          .session(session)
          .lean()) as LeanReview | null;

        if (!review) throw new NotFoundException('Review not found');
        if (review.userId !== userId) {
          throw new ForbiddenException('Not your review');
        }
        this.assertEditable(review.createdAt);

        await this.reviewModel.deleteOne({ _id: reviewId }, { session });
        await this.statsModel.updateOne(
          { doctorId: review.doctorId },
          { $inc: { count: -1, sum: -review.score } },
          { session },
        );
        doctorId = review.doctorId;
      });
    } finally {
      await session.endSession();
    }

    this.invalidateRating(doctorId);
    return { success: true };
  }

  /** Returns the authenticated patient's review for an appointment. */
  async getByAppointment(
    userId: string,
    appointmentId: string,
  ): Promise<{ success: true; review: ReviewView }> {
    if (!userId) throw new ForbiddenException('Authentication required');

    const review = (await this.reviewModel
      .findOne({ appointmentId })
      .lean()) as LeanReview | null;

    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('Not your review');
    }

    return { success: true, review: this.toView(review) };
  }

  /** Returns one bounded page of reviews written for the authenticated doctor. */
  async getDoctorReviews(
    docId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<{
    success: true;
    reviews: ReviewView[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    if (!docId) throw new ForbiddenException('Authentication required');

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize = Number.isInteger(pageSize)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize))
      : DEFAULT_PAGE_SIZE;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ doctorId: docId })
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safePageSize)
        .limit(safePageSize)
        .lean(),
      this.reviewModel.countDocuments({ doctorId: docId }),
    ]);

    return {
      success: true,
      reviews: (reviews as LeanReview[]).map((review) => this.toView(review)),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  /** Returns the public aggregate { avgScore, reviewCount } for a doctor. */
  async getDoctorRating(
    doctorId: string,
  ): Promise<{ avgScore: number; reviewCount: number }> {
    const now = Date.now();
    const cached = this.ratingCache.get(doctorId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const stats = await this.statsModel.findOne({ doctorId }).lean();
    const reviewCount = stats?.count ?? 0;
    const sum = stats?.sum ?? 0;
    const avgScore =
      reviewCount > 0 ? Math.round((sum / reviewCount) * 100) / 100 : 0;
    const result = { avgScore, reviewCount };

    // Unknown doctors are not cached: arbitrary ids would grow the map forever.
    if (reviewCount > 0) {
      this.cacheRating(doctorId, result, now);
    }

    return result;
  }

  /** Stores a rating in the bounded in-memory cache, evicting the oldest key. */
  private cacheRating(
    doctorId: string,
    value: { avgScore: number; reviewCount: number },
    now: number,
  ): void {
    if (this.ratingCache.size >= RATING_CACHE_MAX_ENTRIES) {
      const [oldest] = this.ratingCache.keys();
      if (oldest !== undefined) this.ratingCache.delete(oldest);
    }
    this.ratingCache.set(doctorId, {
      value,
      expiresAt: now + RATING_CACHE_TTL_MS,
    });
  }

  /** Rejects scores outside the 1..5 integer range. */
  private validateScore(score: number): void {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestException('score must be an integer between 1 and 5');
    }
  }

  /** Rejects comments over 500 chars or containing PHI patterns. */
  private validateComment(comment: string): void {
    if (comment.length > MAX_COMMENT_LENGTH) {
      throw new BadRequestException('comment must be at most 500 characters');
    }

    const reason = containsPHI(comment);
    if (reason) {
      throw new BadRequestException({
        message:
          'El comentario no puede contener datos personales ni diagnósticos. ' +
          'Escribe solo tu experiencia con la atención recibida.',
        code: 'PHI_DETECTED',
        reason,
      });
    }
  }

  /** Rejects edits after the 7-day window. */
  private assertEditable(createdAt?: Date | string): void {
    if (!createdAt) {
      throw new BadRequestException('Review creation date is missing');
    }
    const age = Date.now() - new Date(createdAt).getTime();
    if (!Number.isFinite(age) || age > REVIEW_EDIT_WINDOW_MS) {
      throw new BadRequestException('Review can only be edited within 7 days');
    }
  }

  /** Rejects malformed review ids as not found. */
  private assertValidId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Review not found');
    }
  }

  /** Maps a Mongo review document to the public response shape. */
  private toView(review: LeanReview | ReviewDocument): ReviewView {
    const rawId = (review as { _id?: Types.ObjectId | string })._id;
    return {
      id: rawId === undefined ? '' : rawId.toString(),
      doctorId: review.doctorId,
      appointmentId: review.appointmentId,
      score: review.score,
      comment: review.comment,
      createdAt: review.createdAt ?? new Date(),
    };
  }

  /** Evicts the cached rating for a doctor after a write. */
  private invalidateRating(doctorId: string): void {
    this.ratingCache.delete(doctorId);
    this.cacheService?.invalidatePrefix(`doctors:rating:${doctorId}`);
  }
}
