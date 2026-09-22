import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithId extends Request {
    requestId: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const incoming = req.headers['x-request-id'];
        const requestId =
            (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
        (req as RequestWithId).requestId = requestId;
        res.setHeader('X-Request-Id', requestId);
        next();
    }
}