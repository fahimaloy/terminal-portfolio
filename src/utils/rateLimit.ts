/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window approach per IP.
 *
 * Note: For production with multiple server instances, use a distributed
 * rate limiter (e.g., Upstash Redis, Vercel KV, or database-backed).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
    // Stop cleanup if store is empty
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60,
};

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier for the requester (e.g., IP, user ID)
 * @param config - Rate limit configuration (optional, uses defaults)
 * @returns Object with `allowed` boolean and `remaining` count
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {},
): { allowed: boolean; remaining: number; resetAt: number } {
  const { maxRequests, windowSeconds } = { ...defaultConfig, ...config };
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / (windowSeconds * 1000))}`;

  // Start cleanup timer on first use
  startCleanup();

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // First request in this window or window expired
    const resetAt = now + windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0].split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  return req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
}
