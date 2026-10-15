import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface CacheSnapshot<T> {
  value: T;
  etag: string;
  expiresAt: number;
  maxAgeSec: number;
}

interface CacheEntry {
  value: unknown;
  etag: string;
  expiresAt: number;
  maxAgeSec: number;
}

// NO CACHE: PII/PHI (datos de paciente, tokens, perfiles de usuario). Solo
// payloads públicos o agregados. Si dudas, no lo metas aquí.
const CLEANUP_INTERVAL_MS = 60_000;

/**
 * Cache en memoria con TTL por entrada (mismo patrón que SpecialitiesService).
 * Single-réplica: no hay invalidación cruzada entre instancias.
 * Phase 4 (multi-réplica) requiere un store compartido (Redis) — fuera de alcance.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly store = new Map<string, CacheEntry>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.evictExpired(),
      CLEANUP_INTERVAL_MS,
    );
    // No mantener el proceso vivo solo por el timer (útil en tests/CLI).
    this.cleanupInterval.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  get<T>(key: string): CacheSnapshot<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return {
      value: entry.value as T,
      etag: entry.etag,
      expiresAt: entry.expiresAt,
      maxAgeSec: entry.maxAgeSec,
    };
  }

  set<T>(key: string, value: T, ttlMs: number): CacheSnapshot<T> {
    const entry: CacheEntry = {
      value,
      etag: this.etagOf(value),
      expiresAt: Date.now() + ttlMs,
      maxAgeSec: Math.max(0, Math.floor(ttlMs / 1000)),
    };
    this.store.set(key, entry);
    return {
      value,
      etag: entry.etag,
      expiresAt: entry.expiresAt,
      maxAgeSec: entry.maxAgeSec,
    };
  }

  // Borra todas las claves que empiezan por `prefix`. Devuelve cuántas borró.
  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.store.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) this.store.delete(key);
    }
  }

  // ETag = sha1 del payload serializado. No hace falta ordenar claves: el hash
  // se calcula una vez al poblar la entrada y se reutiliza en cada hit.
  private etagOf(value: unknown): string {
    const hash = createHash('sha1')
      .update(JSON.stringify(value) ?? '')
      .digest('hex');
    return `"${hash}"`;
  }
}