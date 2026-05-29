/**
 * Sliding window rate limiter for download requests.
 *
 * Enforces a maximum of 10 download requests per 60-second sliding window
 * per authenticated customer. Returns HTTP 429 with Retry-After header
 * when the limit is exceeded.
 *
 * @see Requirements 13.2, 13.3
 */

/**
 * Configuration for the download rate limiter.
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window. Default: 10 */
  maxRequests: number;
  /** Window size in milliseconds. Default: 60000 (60 seconds) */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Seconds until the oldest request in the window expires (Retry-After value) */
  retryAfterSeconds: number;
}

/**
 * In-memory sliding window rate limiter.
 *
 * Tracks request timestamps per customer ID. On each check, expired
 * timestamps (older than windowMs) are pruned, and the request is
 * allowed only if the count is below maxRequests.
 *
 * Suitable for single-instance deployment on limited hardware (8GB RAM).
 */
export class DownloadRateLimiter {
  private readonly requests: Map<string, number[]> = new Map();
  private readonly config: RateLimiterConfig;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a request from the given customer is allowed under the rate limit.
   * If allowed, the request timestamp is recorded.
   *
   * @param customerId - The authenticated customer's ID
   * @param now - Current timestamp in ms (injectable for testing). Defaults to Date.now()
   * @returns RateLimitResult indicating whether the request is allowed
   */
  check(customerId: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.config.windowMs;

    // Get existing timestamps for this customer, or initialize empty
    let timestamps = this.requests.get(customerId) || [];

    // Prune expired timestamps (outside the sliding window)
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= this.config.maxRequests) {
      // Rate limit exceeded - calculate Retry-After
      // The oldest timestamp in the window determines when a slot opens
      const oldestTimestamp = timestamps[0];
      const retryAfterMs = oldestTimestamp + this.config.windowMs - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      // Store pruned timestamps back
      this.requests.set(customerId, timestamps);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    // Request allowed - record the timestamp
    timestamps.push(now);
    this.requests.set(customerId, timestamps);

    return {
      allowed: true,
      remaining: this.config.maxRequests - timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Reset rate limit state for a specific customer.
   * Useful for testing or administrative override.
   */
  reset(customerId: string): void {
    this.requests.delete(customerId);
  }

  /**
   * Clear all rate limit state.
   * Useful for testing or graceful shutdown.
   */
  resetAll(): void {
    this.requests.clear();
  }

  /**
   * Get the current number of tracked customers.
   * Useful for monitoring memory usage.
   */
  getTrackedCustomerCount(): number {
    return this.requests.size;
  }
}

/**
 * Express/NestJS-compatible middleware factory for download rate limiting.
 *
 * Extracts the customer ID from the request (expects it to be set by
 * authentication middleware on req.user or req.customerId) and applies
 * the sliding window rate limit.
 *
 * @param limiter - DownloadRateLimiter instance (allows sharing across routes)
 * @param extractCustomerId - Function to extract customer ID from request. Defaults to checking req.user?.id or req headers.
 * @returns Express middleware function
 */
export function downloadRateLimitMiddleware(
  limiter: DownloadRateLimiter,
  extractCustomerId?: (req: any) => string | undefined,
) {
  const getCustomerId =
    extractCustomerId ||
    ((req: any): string | undefined => {
      // Try common patterns for authenticated user ID
      return (
        req.user?.id?.toString() ||
        req.customerId?.toString() ||
        req.headers?.['x-customer-id']
      );
    });

  return (req: any, res: any, next: any): void => {
    const customerId = getCustomerId(req);

    if (!customerId) {
      // No customer ID means unauthenticated - skip rate limiting
      // (download endpoints should require auth separately)
      next();
      return;
    }

    const result = limiter.check(customerId);

    // Set rate limit headers for transparency
    res.setHeader('X-RateLimit-Limit', limiter['config'].maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      res.status(429).json({
        statusCode: 429,
        message: 'Too many download requests. Please try again later.',
        error: 'Too Many Requests',
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}
