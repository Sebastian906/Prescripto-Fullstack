import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import type { RequestWithId } from '../middleware/request-id.middleware';

/**
 * Ensures 429 responses include Retry-After header.
 * @nestjs/throttler throws ThrottlerException which extends HttpException(429)
 * but does NOT set Retry-After by default. This filter adds it.
 * Además propaga X-Request-Id / requestId sin romper Retry-After.
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId & Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // ttl from the throttler config (default 60s)
    const retryAfter = 60;
    const requestId =
      req?.requestId ??
      (req?.headers?.['x-request-id'] as string) ??
      'unknown';
    const body = exception.getResponse();
    const payload =
      typeof body === 'object' && body !== null
        ? { ...(body as Record<string, unknown>), requestId }
        : { message: body, requestId };

    response
      .status(status)
      .header('Retry-After', String(retryAfter))
      .header('X-Request-Id', requestId)
      .json(payload);
  }
}
