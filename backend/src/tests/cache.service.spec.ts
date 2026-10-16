import { CacheService } from '../shared/cache/cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new CacheService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('devuelve el valor dentro del TTL', () => {
    service.set('k', { a: 1 }, 60_000);
    expect(service.get('k')?.value).toEqual({ a: 1 });
  });

  it('expira tras el TTL', () => {
    service.set('k', { a: 1 }, 60_000);
    jest.advanceTimersByTime(60_001);
    expect(service.get('k')).toBeNull();
  });

  it('genera un ETag estable y distinto por payload', () => {
    const a1 = service.set('a', { n: 1 }, 1000).etag;
    const a2 = service.set('a', { n: 1 }, 1000).etag;
    const b = service.set('b', { n: 2 }, 1000).etag;
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
    expect(a1).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it('invalidatePrefix borra solo las claves con ese prefijo', () => {
    service.set('reports:annual:d1:2026', 1, 1000);
    service.set('reports:annual:__global__:2026', 2, 1000);
    service.set('doctors:list', 3, 1000);

    const removed = service.invalidatePrefix('reports:annual:d1:');

    expect(removed).toBe(1);
    expect(service.get('reports:annual:d1:2026')).toBeNull();
    expect(service.get('reports:annual:__global__:2026')).not.toBeNull();
    expect(service.get('doctors:list')).not.toBeNull();
  });
});
