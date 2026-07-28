'use strict';

/**
 * In-memory TTL cache with concurrent request coalescing (same key → one compute).
 */
function createShortLivedCache({ ttlMs, maxKeys = 80 }) {
  const dataCache = new Map();
  const inflight = new Map();

  function get(key) {
    const hit = dataCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.payload;
    }
    if (hit) dataCache.delete(key);
    return null;
  }

  function set(key, payload) {
    while (dataCache.size >= maxKeys) {
      const k = dataCache.keys().next().value;
      dataCache.delete(k);
    }
    dataCache.set(key, { expiresAt: Date.now() + ttlMs, payload });
  }

  function clear() {
    dataCache.clear();
    inflight.clear();
  }

  async function wrap(cacheKey, computeFn) {
    const hit = get(cacheKey);
    if (hit !== null && hit !== undefined) return hit;

    if (inflight.has(cacheKey)) {
      return inflight.get(cacheKey);
    }

    const p = (async () => {
      try {
        const payload = await computeFn();
        set(cacheKey, payload);
        return payload;
      } finally {
        inflight.delete(cacheKey);
      }
    })();

    inflight.set(cacheKey, p);
    return p;
  }

  return { wrap, get, set, clear, invalidate: clear };
}

module.exports = { createShortLivedCache };
