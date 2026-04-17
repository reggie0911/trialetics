/**
 * Tiny in-memory keyed cache for short-lived AI-derived results
 * (Insights, Briefing, agent recommendation). Lives per Node process.
 *
 * Why not Redis: Phase 2 wants a 5-minute window so a user navigating
 * around a study doesn't refire 7 agents per page. A LRU map keyed by
 * `(scope, user)` is enough; we'll move to Redis when we add multi-region.
 *
 * Important: keys must already encode anything that should bust the cache
 * (user, study/site/subject ids, role). Use `cacheKey()` to assemble them.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

function evictExpired(now: number): void {
  for (const [k, v] of store.entries()) {
    if (v.expiresAt <= now) store.delete(k);
  }
}

function evictOldest(): void {
  const overflow = store.size - MAX_ENTRIES;
  if (overflow <= 0) return;
  const it = store.keys();
  for (let i = 0; i < overflow; i += 1) {
    const next = it.next();
    if (next.done) break;
    store.delete(next.value);
  }
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  if (entry.expiresAt <= now) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  const now = Date.now();
  store.set(key, { value, expiresAt: now + ttlMs });
  evictExpired(now);
  evictOldest();
}

export function cacheInvalidate(prefix: string): number {
  let removed = 0;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      removed += 1;
    }
  }
  return removed;
}

export function cacheClear(): void {
  store.clear();
}

/**
 * Wraps a producer with a get-or-set. Returns the cached value if present,
 * otherwise produces, stores, and returns the new value.
 */
export async function cached<T>(
  key: string,
  producer: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ value: T; cached: boolean; generatedAt: string }> {
  const hit = cacheGet<{ value: T; generatedAt: string }>(key);
  if (hit) {
    return { value: hit.value, cached: true, generatedAt: hit.generatedAt };
  }
  const value = await producer();
  const generatedAt = new Date().toISOString();
  cacheSet(key, { value, generatedAt }, ttlMs);
  return { value, cached: false, generatedAt };
}

/**
 * Build a stable cache key from named parts. Skips null/undefined parts so
 * "no study selected" and "study=foo" don't share a key.
 */
export function cacheKey(scope: string, parts: Record<string, string | null | undefined>): string {
  const segments = Object.entries(parts)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return `${scope}::${segments.join('|')}`;
}

/** For tests only. */
export const _internal = { store };
