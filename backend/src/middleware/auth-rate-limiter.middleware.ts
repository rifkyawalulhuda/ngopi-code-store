/**
 * Rate limiter for authentication endpoints (login, register).
 *
 * Limits login attempts per IP address to prevent brute-force attacks.
 * Uses a sliding window approach similar to the download rate limiter.
 *
 * Limits:
 * - Login: 5 attempts per 15 minutes per IP
 * - Register: 3 attempts per 15 minutes per IP
 *
 * Returns HTTP 429 with Retry-After header when exceeded.
 */

export interface AuthRateLimiterConfig {
  /** Maximum attempts allowed within the window */
  maxAttempts: number;
  /** Window size in milliseconds */
  windowMs: number;
}

const LOGIN_CONFIG: AuthRateLimiterConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

const REGISTER_CONFIG: AuthRateLimiterConfig = {
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export interface AuthRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class AuthRateLimiter {
  private readonly attempts: Map<string, number[]> = new Map();
  private readonly config: AuthRateLimiterConfig;

  constructor(config: AuthRateLimiterConfig) {
    this.config = config;
  }

  check(key: string, now: number = Date.now()): AuthRateLimitResult {
    const windowStart = now - this.config.windowMs;
    let timestamps = this.attempts.get(key) || [];

    // Prune expired timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= this.config.maxAttempts) {
      const oldestTimestamp = timestamps[0];
      const retryAfterMs = oldestTimestamp + this.config.windowMs - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      this.attempts.set(key, timestamps);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    timestamps.push(now);
    this.attempts.set(key, timestamps);

    return {
      allowed: true,
      remaining: this.config.maxAttempts - timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  resetAll(): void {
    this.attempts.clear();
  }
}

// Singleton instances
const loginLimiter = new AuthRateLimiter(LOGIN_CONFIG);
const registerLimiter = new AuthRateLimiter(REGISTER_CONFIG);

/**
 * Extract client IP from request, considering proxies (Cloudflare, nginx).
 */
function getClientIp(req: any): string {
  return (
    req.headers?.['cf-connecting-ip'] ||
    req.headers?.['x-real-ip'] ||
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

/**
 * Vendure middleware that rate-limits authentication-related GraphQL mutations.
 *
 * Inspects the request body for `login` or `registerCustomerAccount` mutations
 * and applies per-IP rate limiting.
 */
export function authRateLimiterMiddleware(req: any, res: any, next: any): void {
  // Only apply to POST requests to shop-api (GraphQL)
  if (req.method !== 'POST') {
    next();
    return;
  }

  const body = req.body;
  if (!body || typeof body.query !== 'string') {
    next();
    return;
  }

  const query: string = body.query;
  const ip = getClientIp(req);

  // Check if this is a login mutation
  if (query.includes('login(') || query.includes('login (')) {
    const result = loginLimiter.check(ip);

    res.setHeader('X-RateLimit-Limit', LOGIN_CONFIG.maxAttempts.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      res.status(429).json({
        errors: [{
          message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
          extensions: {
            code: 'RATE_LIMITED',
            retryAfterSeconds: result.retryAfterSeconds,
          },
        }],
      });
      return;
    }
  }

  // Check if this is a register mutation
  if (query.includes('registerCustomerAccount(') || query.includes('registerCustomerAccount (')) {
    const result = registerLimiter.check(ip);

    res.setHeader('X-RateLimit-Limit', REGISTER_CONFIG.maxAttempts.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      res.status(429).json({
        errors: [{
          message: 'Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.',
          extensions: {
            code: 'RATE_LIMITED',
            retryAfterSeconds: result.retryAfterSeconds,
          },
        }],
      });
      return;
    }
  }

  next();
}
