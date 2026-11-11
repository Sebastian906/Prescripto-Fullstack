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

export interface ReviewView {
  id: string;
  doctorId: string;
  appointmentId: string;
  score: number;
  comment: string;
  createdAt: Date;
}

type LeanReview = Review & { _id: Types.ObjectId | string };

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewStats.name)
    private readonly statsModel: Model<ReviewStatsDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly appointmentsService: AppointmentsService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

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

  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<{ success: true; review: ReviewView }> {
    if (!userId) throw new ForbiddenException('Authentication required');
    if (dto.score === undefined && dto.comment === undefined) {
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

        const score =
          dto.score === undefined ? review.score : Number(dto.score);
        const comment =
          dto.comment === undefined ? review.comment : dto.comment;
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

  async getDoctorRating(
    doctorId: string,
  ): Promise<{ avgScore: number; reviewCount: number }> {
    const stats = await this.statsModel.findOne({ doctorId }).lean();
    const reviewCount = stats?.count ?? 0;
    const sum = stats?.sum ?? 0;
    const avgScore =
      reviewCount > 0 ? Math.round((sum / reviewCount) * 100) / 100 : 0;

    return { avgScore, reviewCount };
  }

  private validateScore(score: number): void {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestException('score must be an integer between 1 and 5');
    }
  }

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

  private assertEditable(createdAt?: Date | string): void {
    if (!createdAt) {
      throw new BadRequestException('Review creation date is missing');
    }
    const age = Date.now() - new Date(createdAt).getTime();
    if (!Number.isFinite(age) || age > REVIEW_EDIT_WINDOW_MS) {
      throw new BadRequestException('Review can only be edited within 7 days');
    }
  }

  private assertValidId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Review not found');
    }
  }

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

  private invalidateRating(doctorId: string): void {
    this.cacheService?.invalidatePrefix(`doctors:rating:${doctorId}`);
  }
}
