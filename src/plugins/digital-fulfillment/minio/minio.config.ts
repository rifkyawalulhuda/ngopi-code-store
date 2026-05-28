/**
 * MinIO Configuration
 *
 * Environment variables required:
 * - MINIO_ENDPOINT: MinIO server hostname (default: 'localhost')
 * - MINIO_PORT: MinIO server port (default: 9000)
 * - MINIO_ACCESS_KEY: MinIO access key
 * - MINIO_SECRET_KEY: MinIO secret key
 * - MINIO_USE_SSL: Whether to use SSL (default: false)
 */
export interface MinioConfig {
  endPoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
}

export const PRODUCTS_BUCKET = 'products';

export function getMinioConfig(): MinioConfig {
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || '9000', 10);
  const accessKey = process.env.MINIO_ACCESS_KEY || '';
  const secretKey = process.env.MINIO_SECRET_KEY || '';
  const useSSL = process.env.MINIO_USE_SSL === 'true';

  if (!accessKey) {
    throw new Error('MINIO_ACCESS_KEY environment variable is required');
  }
  if (!secretKey) {
    throw new Error('MINIO_SECRET_KEY environment variable is required');
  }

  return { endPoint, port, accessKey, secretKey, useSSL };
}
