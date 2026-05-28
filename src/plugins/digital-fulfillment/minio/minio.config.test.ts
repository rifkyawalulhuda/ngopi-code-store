import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getMinioConfig, PRODUCTS_BUCKET } from './minio.config';

describe('MinIO Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return config with default values when optional env vars are not set', () => {
    process.env.MINIO_ACCESS_KEY = 'test-access-key';
    process.env.MINIO_SECRET_KEY = 'test-secret-key';

    const config = getMinioConfig();

    expect(config.endPoint).toBe('localhost');
    expect(config.port).toBe(9000);
    expect(config.useSSL).toBe(false);
    expect(config.accessKey).toBe('test-access-key');
    expect(config.secretKey).toBe('test-secret-key');
  });

  it('should use environment variables when provided', () => {
    process.env.MINIO_ENDPOINT = 'minio.example.com';
    process.env.MINIO_PORT = '9001';
    process.env.MINIO_ACCESS_KEY = 'my-access-key';
    process.env.MINIO_SECRET_KEY = 'my-secret-key';
    process.env.MINIO_USE_SSL = 'true';

    const config = getMinioConfig();

    expect(config.endPoint).toBe('minio.example.com');
    expect(config.port).toBe(9001);
    expect(config.useSSL).toBe(true);
    expect(config.accessKey).toBe('my-access-key');
    expect(config.secretKey).toBe('my-secret-key');
  });

  it('should throw error when MINIO_ACCESS_KEY is not set', () => {
    process.env.MINIO_SECRET_KEY = 'test-secret-key';
    delete process.env.MINIO_ACCESS_KEY;

    expect(() => getMinioConfig()).toThrow('MINIO_ACCESS_KEY environment variable is required');
  });

  it('should throw error when MINIO_SECRET_KEY is not set', () => {
    process.env.MINIO_ACCESS_KEY = 'test-access-key';
    delete process.env.MINIO_SECRET_KEY;

    expect(() => getMinioConfig()).toThrow('MINIO_SECRET_KEY environment variable is required');
  });

  it('should export PRODUCTS_BUCKET as "products"', () => {
    expect(PRODUCTS_BUCKET).toBe('products');
  });

  it('should parse port as integer', () => {
    process.env.MINIO_ACCESS_KEY = 'key';
    process.env.MINIO_SECRET_KEY = 'secret';
    process.env.MINIO_PORT = '443';

    const config = getMinioConfig();
    expect(config.port).toBe(443);
  });

  it('should default useSSL to false when env var is not "true"', () => {
    process.env.MINIO_ACCESS_KEY = 'key';
    process.env.MINIO_SECRET_KEY = 'secret';
    process.env.MINIO_USE_SSL = 'false';

    const config = getMinioConfig();
    expect(config.useSSL).toBe(false);
  });
});
