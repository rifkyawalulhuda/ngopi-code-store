import { Request, Response, NextFunction } from 'express';
import {
  memoryGuardMiddleware,
  getMemoryLimits,
  getMemoryStatus,
} from './memory-guard.middleware';

describe('memoryGuardMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  it('should call next() when memory is below rejection threshold', () => {
    // Normal operation - RSS should be well below 1GB in test environment
    memoryGuardMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should reject with 503 when memory exceeds 1GB threshold', () => {
    // Mock process.memoryUsage to return > 1GB RSS
    const originalMemoryUsage = process.memoryUsage;
    const mockMemoryUsage = jest.fn().mockReturnValue({
      rss: 1.1 * 1024 * 1024 * 1024, // 1.1 GB
      heapTotal: 500 * 1024 * 1024,
      heapUsed: 400 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    });
    process.memoryUsage = mockMemoryUsage as unknown as typeof process.memoryUsage;

    memoryGuardMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        message: 'Service overload: memory usage exceeds threshold',
        error: 'Service Unavailable',
      }),
    );

    process.memoryUsage = originalMemoryUsage;
  });

  it('should allow requests when memory is exactly at 1GB (not exceeding)', () => {
    const originalMemoryUsage = process.memoryUsage;
    const mockMemoryUsage = jest.fn().mockReturnValue({
      rss: 1024 * 1024 * 1024, // Exactly 1GB
      heapTotal: 500 * 1024 * 1024,
      heapUsed: 400 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    });
    process.memoryUsage = mockMemoryUsage as unknown as typeof process.memoryUsage;

    memoryGuardMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    // Exactly at threshold (not exceeding) should still pass
    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();

    process.memoryUsage = originalMemoryUsage;
  });
});

describe('getMemoryLimits', () => {
  it('should return correct memory limits', () => {
    const limits = getMemoryLimits();
    expect(limits.normalLimitMB).toBe(900);
    expect(limits.rejectionThresholdMB).toBe(1024);
  });
});

describe('getMemoryStatus', () => {
  it('should return current memory status with correct structure', () => {
    const status = getMemoryStatus();
    expect(status).toHaveProperty('rssMB');
    expect(status).toHaveProperty('normalLimitMB', 900);
    expect(status).toHaveProperty('rejectionThresholdMB', 1024);
    expect(status).toHaveProperty('isAboveNormalLimit');
    expect(status).toHaveProperty('isAboveRejectionThreshold');
    expect(typeof status.rssMB).toBe('number');
  });

  it('should report below thresholds in test environment', () => {
    const status = getMemoryStatus();
    // In a test environment, we should be well below limits
    expect(status.isAboveRejectionThreshold).toBe(false);
  });
});
