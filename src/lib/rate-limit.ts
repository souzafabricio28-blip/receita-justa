import { logger } from "./logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const FIVE_MIN = 5 * 60 * 1000;
const ONE_MIN = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, ONE_MIN);

export function rateLimit(key: string, maxAttempts: number, windowMs: number = FIVE_MIN): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  if (entry.count >= maxAttempts) {
    logger.warn("Rate limit exceeded", { key });
    return { ok: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { ok: true, remaining: maxAttempts - entry.count, resetIn: entry.resetAt - now };
}
