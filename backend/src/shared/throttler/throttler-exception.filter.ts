import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

/**
 * Ensures 429 responses include Retry-After header.
 * @nestjs/throttler throws ThrottlerException which extends HttpException(429)
 * but does NOT set Retry-After by default. This filter adds it.
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // ttl from the throttler config (default 60s)
    const retryAfter = 60;

    response
      .status(status)
      .header('Retry-After', String(retryAfter))
      .json(exception.getResponse());
  }
}
