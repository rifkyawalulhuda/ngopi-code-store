import { Request, Response, NextFunction } from 'express';
import { getMemoryStatus } from './memory-guard.middleware';

/**
 * Health check middleware for Docker/Dokploy container health monitoring.
 * Responds to GET /health with service status information.
 *
 * Used by:
 * - Docker HEALTHCHECK in Dockerfile
 * - Dokploy health monitoring
 * - Cloudflare Tunnel origin health checks
 */
export function healthCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method === 'GET' && req.path === '/health') {
    const memoryStatus = getMemoryStatus();
    const status = memoryStatus.isAboveRejectionThreshold ? 'degraded' : 'healthy';

    res.status(status === 'healthy' ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: {
        rssMB: memoryStatus.rssMB,
        limitMB: memoryStatus.rejectionThresholdMB,
      },
    });
    return;
  }

  next();
}
