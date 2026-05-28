import * as Minio from 'minio';
import { getMinioConfig, MinioConfig, PRODUCTS_BUCKET } from './minio.config';

let minioClientInstance: Minio.Client | null = null;

/**
 * Returns a singleton MinIO client instance.
 * The client is configured using environment variables and reused across the application.
 */
export function getMinioClient(): Minio.Client {
  if (!minioClientInstance) {
    const config: MinioConfig = getMinioConfig();
    minioClientInstance = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }
  return minioClientInstance;
}

/**
 * Initializes the MinIO storage by ensuring the required buckets exist.
 * Creates the 'products' bucket with private access if it does not already exist.
 *
 * This should be called once during application startup.
 */
export async function initializeMinioBuckets(): Promise<void> {
  const client = getMinioClient();

  const bucketExists = await client.bucketExists(PRODUCTS_BUCKET);
  if (!bucketExists) {
    await client.makeBucket(PRODUCTS_BUCKET);

    // Set bucket policy to private (deny all public access)
    const privateBucketPolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${PRODUCTS_BUCKET}/*`],
        },
      ],
    });
    await client.setBucketPolicy(PRODUCTS_BUCKET, privateBucketPolicy);
  }
}

/**
 * Resets the singleton instance. Used for testing purposes only.
 */
export function resetMinioClient(): void {
  minioClientInstance = null;
}
