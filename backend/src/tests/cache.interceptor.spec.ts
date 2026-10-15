import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { CacheService } from '../shared/cache/cache.service';
import {
  CACHE_TTL_METADATA,
  CacheInterceptor,
  CacheTtlOptions,
} from '../shared/cache/cache.interceptor';

function context(
  req: Record<string, unknown>,
  res: Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

function res() {
  return { setHeader: jest.fn(), status: jest.fn().mockReturnThis() };
}

describe('CacheInterceptor', () => {
  let cache: CacheService;
  let interceptor: CacheInterceptor;
  const reflector = { get: jest.fn() } as unknown as Reflector;

  const withOptions = (opts?: CacheTtlOptions) =>
    (reflector.get as jest.Mock).mockImplementation((token: string) =>
      token === CACHE_TTL_METADATA ? opts : undefined,
    );

  beforeEach(() => {
    cache = new CacheService();
    interceptor = new CacheInterceptor(reflector, cache);
  });

  afterEach(() => cache.onModuleDestroy());

  it('miss: ejecuta el handler, emite ETag y X-Cache: MISS', async () => {
    withOptions({ ttlMs: 60_000, key: () => 'doctors:list' });
    const r = res();
    const next: CallHandler = { handle: jest.fn(() => of({ ok: 1 })) };

    const out = await firstValueFrom(
      await interceptor.intercept(
        context({ method: 'GET', originalUrl: '/x', headers: {} }, r),
        next,
      ),
    );

    expect(out).toEqual({ ok: 1 });
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(r.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
    expect(r.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
  });

  it('hit: no vuelve a ejecutar el handler', async () => {
    withOptions({ ttlMs: 60_000, key: () => 'doctors:list' });
    await firstValueFrom(
      await interceptor.intercept(
        context({ method: 'GET', originalUrl: '/x', headers: {} }, res()),
        { handle: jest.fn(() => of({ ok: 1 })) },
      ),
    );

    const next: CallHandler = {
      handle: jest.fn(() => {
        throw new Error('no debe ejecutarse');
      }),
    };
    const out = await firstValueFrom(
      await interceptor.intercept(
        context({ method: 'GET', originalUrl: '/x', headers: {} }, res()),
        next,
      ),
    );

    expect(out).toEqual({ ok: 1 });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('304 cuando If-None-Match coincide con el ETag', async () => {
    withOptions({ ttlMs: 60_000, key: () => 'k' });
    cache.set('k', { ok: 1 }, 60_000);
    const etag = cache.get('k')!.etag;
    const r = res();

    const out = await firstValueFrom(
      await interceptor.intercept(
        context(
          { method: 'GET', originalUrl: '/x', headers: { 'if-none-match': etag } },
          r,
        ),
        { handle: jest.fn(() => of({ ok: 1 })) },
      ),
    );

    expect(out).toBeUndefined();
    expect(r.status).toHaveBeenCalledWith(304);
  });

  it('no cachea (pass-through) cuando keyFn devuelve undefined', async () => {
    withOptions({ ttlMs: 60_000, key: () => undefined });
    const r = res();
    const next: CallHandler = { handle: jest.fn(() => of('csv')) };

    const out = await firstValueFrom(
      await interceptor.intercept(
        context({ method: 'GET', originalUrl: '/x', headers: {} }, r),
        next,
      ),
    );

    expect(out).toBe('csv');
    expect(r.setHeader).not.toHaveBeenCalled();
  });

  it('ignora métodos no-GET', async () => {
    withOptions({ ttlMs: 60_000, key: () => 'k' });
    const next: CallHandler = { handle: jest.fn(() => of('x')) };
    const out = await firstValueFrom(
      await interceptor.intercept(
        context({ method: 'POST', originalUrl: '/x', headers: {} }, res()),
        next,
      ),
    );
    expect(out).toBe('x');
    expect(next.handle).toHaveBeenCalledTimes(1);
  });
});