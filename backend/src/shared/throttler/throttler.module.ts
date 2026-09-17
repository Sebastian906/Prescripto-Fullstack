import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
* Custom ThrottlerGuard that uses req.userId for authenticated endpoints.
* Falls back to IP for unauthenticated routes (login, register, etc.).
*/
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
    constructor(options: any, storageService: ThrottlerStorage, reflector: Reflector) {
        super(options, storageService, reflector);
    }

    protected async getTracker(req: Record<string, any>): Promise<string> {
        const userId = (req as any).userId;
        if (userId) return `user_${userId}`;
        return req.ip || req.socket?.remoteAddress || 'unknown';
    }
}

@Module({
    imports: [
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60000,   // 1 minute window
                limit: 100,   // global fallback: 100 req/min/IP
            },
        ]),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: UserAwareThrottlerGuard,
        },
    ],
    exports: [ThrottlerModule],
})
export class ThrottlerConfigModule { }