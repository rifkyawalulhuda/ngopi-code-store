import { Request, Response, NextFunction } from 'express';

/**
 * Memory limits for the Vendure backend (Req 12.1, 12.5).
 *
 * - NORMAL_LIMIT_MB: 900MB - target ceiling during normal operation
 * - REJECTION_THRESHOLD_MB: 1024MB (1GB) - reject new requests above this
 */
const NORMAL_LIMIT_MB = 900;
const REJECTION_THRESHOLD_MB = 1024;

const BYTES_PER_MB = 1024 * 1024;
const REJECTION_THRESHOLD_BYTES = REJECTION_THRESHOLD_MB * BYTES_PER_MB;

/**
 * Express middleware that rejects incoming requests when the process RSS
 * memory exceeds the 1GB rejection threshold.
 *
 * Requirement 12.5: If memory exceeds 1GB, reject new requests with
 * service overload error until memory returns below the limit.
 */
export function memoryGuardMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const memoryUsage = process.memoryUsage();
  const rssBytes = memoryUsage.rss;

  if (rssBytes > REJECTION_THRESHOLD_BYTES) {
    const rssMB = Math.round(rssBytes / BYTES_PER_MB);
    res.status(503).json({
      statusCode: 503,
      message: 'Service overload: memory usage exceeds threshold',
      error: 'Service Unavailable',
      details: {
        currentRssMB: rssMB,
        thresholdMB: REJECTION_THRESHOLD_MB,
      },
    });
    return;
  }

  next();
}

/**
 * Returns the configured memory limits for use in health checks and monitoring.
 */
export function getMemoryLimits() {
  return {
    normalLimitMB: NORMAL_LIMIT_MB,
    rejectionThresholdMB: REJECTION_THRESHOLD_MB,
  };
}

/**
 * Returns current memory usage status.
 */
export function getMemoryStatus() {
  const memoryUsage = process.memoryUsage();
  const rssMB = Math.round(memoryUsage.rss / BYTES_PER_MB);

  return {
    rssMB,
    normalLimitMB: NORMAL_LIMIT_MB,
    rejectionThresholdMB: REJECTION_THRESHOLD_MB,
    isAboveNormalLimit: rssMB > NORMAL_LIMIT_MB,
    isAboveRejectionThreshold: rssMB > REJECTION_THRESHOLD_MB,
  };
}
