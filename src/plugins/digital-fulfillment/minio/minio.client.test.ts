import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PRODUCTS_BUCKET } from './minio.config';

const mockBucketExists = vi.fn();
const mockMakeBucket = vi.fn();
const mockSetBucketPolicy = vi.fn();

vi.mock('minio', () => {
  return {
    Client: class MockClient {
      bucketExists = mockBucketExists;
      makeBucket = mockMakeBucket;
      setBucketPolicy = mockSetBucketPolicy;
    },
  };
});

import { getMinioClient, initializeMinioBuckets, resetMinioClient } from './minio.client';

describe('MinIO Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.MINIO_ACCESS_KEY = 'test-access-key';
    process.env.MINIO_SECRET_KEY = 'test-secret-key';
    resetMinioClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getMinioClient', () => {
    it('should return a MinIO client instance', () => {
      const client = getMinioClient();
      expect(client).toBeDefined();
    });

    it('should return the same instance on subsequent calls (singleton)', () => {
      const client1 = getMinioClient();
      const client2 = getMinioClient();
      expect(client1).toBe(client2);
    });

    it('should create a new instance after reset', () => {
      const client1 = getMinioClient();
      resetMinioClient();
      const client2 = getMinioClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('initializeMinioBuckets', () => {
    it('should create products bucket if it does not exist', async () => {
      mockBucketExists.mockResolvedValue(false);
      mockMakeBucket.mockResolvedValue(undefined);
      mockSetBucketPolicy.mockResolvedValue(undefined);

      await initializeMinioBuckets();

      expect(mockBucketExists).toHaveBeenCalledWith(PRODUCTS_BUCKET);
      expect(mockMakeBucket).toHaveBeenCalledWith(PRODUCTS_BUCKET);
      expect(mockSetBucketPolicy).toHaveBeenCalledWith(
        PRODUCTS_BUCKET,
        expect.any(String),
      );
    });

    it('should set private bucket policy denying public access', async () => {
      mockBucketExists.mockResolvedValue(false);
      mockMakeBucket.mockResolvedValue(undefined);
      mockSetBucketPolicy.mockResolvedValue(undefined);

      await initializeMinioBuckets();

      const policyArg = mockSetBucketPolicy.mock.calls[0][1];
      const policy = JSON.parse(policyArg);

      expect(policy.Statement[0].Effect).toBe('Deny');
      expect(policy.Statement[0].Principal).toBe('*');
      expect(policy.Statement[0].Action).toContain('s3:GetObject');
      expect(policy.Statement[0].Resource).toContain(`arn:aws:s3:::${PRODUCTS_BUCKET}/*`);
    });

    it('should not create bucket if it already exists', async () => {
      mockBucketExists.mockResolvedValue(true);

      await initializeMinioBuckets();

      expect(mockBucketExists).toHaveBeenCalledWith(PRODUCTS_BUCKET);
      expect(mockMakeBucket).not.toHaveBeenCalled();
      expect(mockSetBucketPolicy).not.toHaveBeenCalled();
    });
  });
});
