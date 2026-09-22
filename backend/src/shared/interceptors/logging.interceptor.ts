import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import type { RequestWithId } from '../middleware/request-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithId & Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const requestId = req.requestId ?? 'unknown';
    const { method, originalUrl } = req;
    const started = Date.now();
    const log = (status: number) =>
      this.logger.log(
        JSON.stringify({
          method,
          path: originalUrl,
          status,
          ms: Date.now() - started,
          requestId,
        }),
      );
    return next.handle().pipe(
      tap(() => log(res.statusCode ?? 200)),
      catchError((err) => {
        log((err?.status as number) ?? 500);
        return throwError(() => err);
      }),
    );
  }
}
