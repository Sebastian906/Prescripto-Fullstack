import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, firstValueFrom, of } from 'rxjs';
import { CacheService, CacheSnapshot } from './cache.service';

export const CACHE_TTL_METADATA = 'cache:ttl';

export type CacheKeyFn = (req: Request) => string | undefined;

export interface CacheTtlOptions {
  ttlMs: number;
  key?: CacheKeyFn;
}

/**
 * Marca un handler GET como cacheable en memoria.
 * @param ttlMs TTL en ms (doctors list 60_000, global stats 300_000).
 * @param key   Opcional: clave explícita. Devolver undefined = no cachear
 *              (p. ej. respuestas en streaming/CSV).
 */
export const CacheTtl = (ttlMs: number, key?: CacheKeyFn) =>
  SetMetadata(CACHE_TTL_METADATA, { ttlMs, key });

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Solo GET; el resto pasa sin tocar.
    if (req.method !== 'GET') return next.handle();

    const options = this.reflector.get<CacheTtlOptions | undefined>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const key = options.key
      ? options.key(req)
      : `${req.method}:${req.originalUrl}`;
    // key undefined (p. ej. format=csv) -> no cachear.
    if (!key) return next.handle();

    const ifNoneMatch = req.headers['if-none-match'];
    const hit = this.cache.get(key);
    if (hit) {
      return this.reply(res, hit, ifNoneMatch, true);
    }

    // defaultValue: un handler que completa sin emitir (p. ej. res.send en un
    // stream) no debe lanzar EmptyError; se responde sin cachear.
    const value = await firstValueFrom(next.handle() as Observable<unknown>, {
      defaultValue: undefined,
    });
    if (value === undefined) return of(undefined);
    const fresh = this.cache.set(key, value, options.ttlMs);
    return this.reply(res, fresh, ifNoneMatch, false);
  }

  private reply(
    res: Response,
    snapshot: CacheSnapshot<unknown>,
    ifNoneMatch: string | undefined,
    hit: boolean,
  ): Observable<unknown> {
    res.setHeader('ETag', snapshot.etag);
    // private: evita que caches compartidos cacheen agregados admin.
    res.setHeader('Cache-Control', `private, max-age=${snapshot.maxAgeSec}`);
    res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');

    if (ifNoneMatch && this.matches(ifNoneMatch, snapshot.etag)) {
      res.status(304);
      return of(undefined);
    }
    return of(snapshot.value);
  }

  private matches(header: string, etag: string): boolean {
    const value = header.trim();
    if (value === '*') return true; // If-None-Match: * → siempre coincide
    return value
      .split(',')
      .map((v) => v.trim().replace(/^W\//, ''))
      .includes(etag);
  }
}
