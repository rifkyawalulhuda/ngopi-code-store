import {
  DownloadRateLimiter,
  downloadRateLimitMiddleware,
  RateLimitResult,
} from './download-rate-limiter.middleware';

describe('DownloadRateLimiter', () => {
  let limiter: DownloadRateLimiter;

  beforeEach(() => {
    limiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 60_000 });
  });

  describe('check()', () => {
    it('should allow the first request', () => {
      const result = limiter.check('customer-1', 1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it('should allow up to 10 requests within the window', () => {
      const baseTime = 100_000;
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('customer-1', baseTime + i * 1000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it('should reject the 11th request within the window', () => {
      const baseTime = 100_000;
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.check('customer-1', baseTime + i * 1000);
      }
      // 11th request should be rejected
      const result = limiter.check('customer-1', baseTime + 10_000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should calculate correct Retry-After seconds', () => {
      const baseTime = 100_000;
      // Make 10 requests at baseTime
      for (let i = 0; i < 10; i++) {
        limiter.check('customer-1', baseTime);
      }
      // Try at baseTime + 30s (30s into the window)
      const result = limiter.check('customer-1', baseTime + 30_000);
      expect(result.allowed).toBe(false);
      // Oldest request at baseTime expires at baseTime + 60_000
      // Retry-After = (baseTime + 60_000 - (baseTime + 30_000)) / 1000 = 30
      expect(result.retryAfterSeconds).toBe(30);
    });

    it('should allow requests after the window expires', () => {
      const baseTime = 100_000;
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.check('customer-1', baseTime);
      }
      // After 60 seconds, all should be expired
      const result = limiter.check('customer-1', baseTime + 60_001);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should track customers independently', () => {
      const baseTime = 100_000;
      // Fill up customer-1's limit
      for (let i = 0; i < 10; i++) {
        limiter.check('customer-1', baseTime);
      }
      // customer-2 should still be allowed
      const result = limiter.check('customer-2', baseTime);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should use sliding window - partial expiry allows new requests', () => {
      const baseTime = 100_000;
      // Make 5 requests at baseTime
      for (let i = 0; i < 5; i++) {
        limiter.check('customer-1', baseTime);
      }
      // Make 5 requests at baseTime + 30s
      for (let i = 0; i < 5; i++) {
        limiter.check('customer-1', baseTime + 30_000);
      }
      // At baseTime + 60_001, the first 5 expire, leaving 5 in window
      const result = limiter.check('customer-1', baseTime + 60_001);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 remaining from second batch + 1 new = 6 total, so 4 remaining
    });

    it('should return retryAfterSeconds of at least 1', () => {
      const baseTime = 100_000;
      for (let i = 0; i < 10; i++) {
        limiter.check('customer-1', baseTime);
      }
      // Try just 1ms later - should still return at least 1 second
      const result = limiter.check('customer-1', baseTime + 1);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reset()', () => {
    it('should clear rate limit state for a specific customer', () => {
      const baseTime = 100_000;
      for (let i = 0; i < 10; i++) {
        limiter.check('customer-1', baseTime);
      }
      limiter.reset('customer-1');
      const result = limiter.check('customer-1', baseTime);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should not affect other customers', () => {
      const baseTime = 100_000;
      limiter.check('customer-1', baseTime);
      limiter.check('customer-2', baseTime);
      limiter.reset('customer-1');
      expect(limiter.getTrackedCustomerCount()).toBe(1);
    });
  });

  describe('resetAll()', () => {
    it('should clear all rate limit state', () => {
      limiter.check('customer-1', 1000);
      limiter.check('customer-2', 1000);
      limiter.resetAll();
      expect(limiter.getTrackedCustomerCount()).toBe(0);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom maxRequests', () => {
      const customLimiter = new DownloadRateLimiter({ maxRequests: 3, windowMs: 60_000 });
      const baseTime = 100_000;
      for (let i = 0; i < 3; i++) {
        expect(customLimiter.check('c1', baseTime).allowed).toBe(true);
      }
      expect(customLimiter.check('c1', baseTime).allowed).toBe(false);
    });

    it('should respect custom windowMs', () => {
      const customLimiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 10_000 });
      const baseTime = 100_000;
      for (let i = 0; i < 10; i++) {
        customLimiter.check('c1', baseTime);
      }
      // After 10 seconds (custom window), should be allowed again
      const result = customLimiter.check('c1', baseTime + 10_001);
      expect(result.allowed).toBe(true);
    });
  });
});

describe('downloadRateLimitMiddleware', () => {
  let limiter: DownloadRateLimiter;
  let middleware: ReturnType<typeof downloadRateLimitMiddleware>;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    limiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 60_000 });
    middleware = downloadRateLimitMiddleware(limiter);
    mockReq = { user: { id: 'customer-123' }, headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should call next() when request is allowed', () => {
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should set rate limit headers on allowed requests', () => {
    middleware(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
  });

  it('should return 429 when rate limit is exceeded', () => {
    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
      };
      middleware(mockReq, res, jest.fn());
    }
    // 11th request
    middleware(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        message: 'Too many download requests. Please try again later.',
        error: 'Too Many Requests',
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set Retry-After header when rate limited', () => {
    for (let i = 0; i < 10; i++) {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
      };
      middleware(mockReq, res, jest.fn());
    }
    middleware(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(String),
    );
  });

  it('should skip rate limiting for unauthenticated requests', () => {
    mockReq = { headers: {} };
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should support custom customer ID extractor', () => {
    const customExtractor = (req: any) => req.headers['x-custom-id'];
    const customMiddleware = downloadRateLimitMiddleware(limiter, customExtractor);
    mockReq = { headers: { 'x-custom-id': 'custom-456' } };

    customMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
  });

  it('should extract customer ID from x-customer-id header as fallback', () => {
    mockReq = { headers: { 'x-customer-id': 'header-customer-789' } };
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
  });
});
