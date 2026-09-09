/**
 * Client-Side In-Memory Cache Store
 * Allows instant navigation between tabs, sub-views, and modals without 5-second loading delays.
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiry: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

// Default TTL: 10 minutes
export const DEFAULT_CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Generate a deterministic cache key from command name and payload
 */
export function getCacheKey(command: string, payload?: Record<string, unknown>): string {
  if (!payload || Object.keys(payload).length === 0) {
    return command;
  }
  // Exclude forceRefresh from the cache key so refresh updates the same key
  const { forceRefresh, ...rest } = payload as Record<string, unknown> & { forceRefresh?: boolean };
  const keys = Object.keys(rest).sort();
  const serialized = keys
    .map((k) => {
      const val = rest[k];
      if (Array.isArray(val)) {
        return `${k}:${[...val].sort().join(',')}`;
      }
      return `${k}:${String(val)}`;
    })
    .join('|');

  return `${command}?${serialized}`;
}

/**
 * Retrieve cached data if present and not expired
 */
export function getClientCache<T = unknown>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store data in the client cache with a TTL
 */
export function setClientCache<T = unknown>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_CLIENT_CACHE_TTL_MS
): void {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  });
}

/**
 * Invalidate cache entries matching a key or prefix
 */
export function invalidateClientCache(prefixOrKey?: string): void {
  if (!prefixOrKey) {
    cacheStore.clear();
    return;
  }
  for (const key of Array.from(cacheStore.keys())) {
    if (key.startsWith(prefixOrKey)) {
      cacheStore.delete(key);
    }
  }
}
