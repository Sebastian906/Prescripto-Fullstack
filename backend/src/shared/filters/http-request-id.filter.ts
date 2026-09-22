import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { RequestWithId } from '../middleware/request-id.middleware';

@Catch()
export class HttpRequestIdFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest<RequestWithId & Request>();
        const res = ctx.getResponse<Response>();
        const requestId =
            req.requestId ??
            (req.headers['x-request-id'] as string) ??
            'unknown';
        res.setHeader('X-Request-Id', requestId);
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const message =
                typeof body === 'string'
                    ? body
                    : ((body as Record<string, unknown>)?.['message'] ?? body);
            res.status(status).json({ statusCode: status, message, requestId });
        } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
                requestId,
            });
        }
    }
}