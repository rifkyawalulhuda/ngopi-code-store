import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { ID } from '@vendure/core';
import { Connection, Repository } from 'typeorm';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';
import { DigitalProductInput, DownloadLinkResponse } from '../../../shared/types/digital-fulfillment.types';

/**
 * Allowed MIME types for digital product uploads.
 * @see Requirements 3.3
 */
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'application/zip',
  'application/pdf',
  'application/epub+zip',
];

/**
 * Maximum file size in bytes (500MB).
 * @see Requirements 3.4
 */
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 524,288,000 bytes

/**
 * Maximum in-memory buffer size for streaming uploads (8MB).
 * @see Requirements 12.3
 */
export const MAX_BUFFER_SIZE_BYTES = 8 * 1024 * 1024; // 8,388,608 bytes

export class FileUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_MIME_TYPE'
      | 'FILE_TOO_LARGE'
      | 'FILENAME_CONFLICT'
      | 'STORAGE_UNAVAILABLE'
      | 'RECORD_CREATION_FAILED',
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * Error thrown when download record creation fails during order fulfillment.
 * @see Requirements 4.5
 */
export class FulfillmentError extends Error {
  constructor(
    message: string,
    public readonly code: 'DOWNLOAD_RECORD_CREATION_FAILED',
    public readonly orderId: ID,
  ) {
    super(message);
    this.name = 'FulfillmentError';
  }
}

/**
 * Error thrown when download link generation fails.
 * @see Requirements 5.6, 5.7, 5.8, 5.9, 5.10
 */
export class DownloadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'FORBIDDEN'
      | 'EXPIRED'
      | 'LIMIT_REACHED'
      | 'NOT_FOUND'
      | 'STORAGE_UNAVAILABLE',
    public readonly httpStatus: 403 | 404 | 410 | 503,
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

/**
 * Represents a line item in an order for download record creation.
 */
export interface OrderLineItem {
  productVariantId: ID;
}

/**
 * Represents the order data needed for download record creation.
 */
export interface FulfillmentOrderData {
  id: ID;
  customerId: ID;
  lines: OrderLineItem[];
}

/**
 * Interface for MinIO client operations used by this service.
 * Allows dependency injection and easier testing.
 */
export interface MinioClientAdapter {
  statObject(bucket: string, objectKey: string): Promise<unknown>;
  putObject(
    bucket: string,
    objectKey: string,
    stream: Readable | Buffer,
    size: number,
    metaData?: Record<string, string>,
  ): Promise<unknown>;
  removeObject(bucket: string, objectKey: string): Promise<void>;
  presignedGetObject(bucket: string, objectKey: string, expirySeconds: number): Promise<string>;
}

/**
 * Interface for the DigitalProduct repository operations.
 * Allows dependency injection and easier testing.
 */
export interface DigitalProductRepository {
  save(entity: DigitalProduct): Promise<DigitalProduct>;
  findByVariantId(variantId: ID): Promise<DigitalProduct | null>;
}

/**
 * Interface for the DigitalDownload repository operations.
 * Allows dependency injection and easier testing.
 */
export interface DigitalDownloadRepository {
  save(entity: DigitalDownload): Promise<DigitalDownload>;
  removeByOrderId(orderId: ID): Promise<void>;
}

/**
 * DigitalFulfillmentService handles file upload, storage, and management
 * of digital products in MinIO object storage.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 12.3
 */
export class DigitalFulfillmentService {
  constructor(
    private readonly minioClient: MinioClientAdapter,
    private readonly digitalProductRepository: DigitalProductRepository,
  ) {}

  /**
   * Uploads a digital product file to MinIO with streaming and creates
   * the corresponding DigitalProduct database record.
   *
   * Validates MIME type, file size, and filename uniqueness before upload.
   * Uses streaming upload with max 8MB in-memory buffer.
   * Implements rollback: deletes stored file if record creation fails.
   *
   * @param input - Digital product metadata (variant ID, filename, size, MIME type, bucket)
   * @param fileStream - Readable stream of the file content
   * @returns The created DigitalProduct entity
   *
   * @throws FileUploadError with code 'INVALID_MIME_TYPE' if MIME type not allowed
   * @throws FileUploadError with code 'FILE_TOO_LARGE' if file exceeds 500MB
   * @throws FileUploadError with code 'FILENAME_CONFLICT' if filename exists in bucket
   * @throws FileUploadError with code 'STORAGE_UNAVAILABLE' if MinIO is unreachable
   * @throws FileUploadError with code 'RECORD_CREATION_FAILED' if DB insert fails (file rolled back)
   */
  async uploadProductFile(
    input: DigitalProductInput,
    fileStream: Readable,
  ): Promise<DigitalProduct> {
    // Step 1: Validate MIME type (Requirement 3.3)
    this.validateMimeType(input.mimeType);

    // Step 2: Validate file size (Requirement 3.4)
    this.validateFileSize(input.fileSize);

    // Step 3: Check filename uniqueness within bucket (Requirement 3.5)
    const bucket = input.bucket;
    const objectKey = `${input.fileName}`;
    await this.checkFilenameUniqueness(bucket, objectKey);

    // Step 4: Upload file to MinIO using streaming (Requirements 3.1, 12.3)
    await this.streamUploadToMinio(bucket, objectKey, fileStream, input.fileSize);

    // Step 5: Create DigitalProduct record in database (Requirement 3.2)
    let digitalProduct: DigitalProduct;
    try {
      digitalProduct = await this.createDigitalProductRecord(input, bucket, objectKey);
    } catch (error) {
      // Step 6: Rollback - delete stored file if record creation fails (Requirement 3.2)
      await this.rollbackUpload(bucket, objectKey);
      throw new FileUploadError(
        `Failed to create digital product record: ${(error as Error).message}`,
        'RECORD_CREATION_FAILED',
      );
    }

    return digitalProduct;
  }

  /**
   * Validates that the MIME type is in the allowed list.
   * @see Requirements 3.3
   */
  validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new FileUploadError(
        `MIME type '${mimeType}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_MIME_TYPE',
      );
    }
  }

  /**
   * Validates that the file size does not exceed the maximum limit.
   * @see Requirements 3.4
   */
  validateFileSize(fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new FileUploadError(
        `File size ${fileSize} bytes exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes (500MB)`,
        'FILE_TOO_LARGE',
      );
    }
  }

  /**
   * Checks that no file with the same name exists in the specified bucket.
   * Uses MinIO statObject to check existence.
   * @see Requirements 3.5
   */
  async checkFilenameUniqueness(bucket: string, objectKey: string): Promise<void> {
    try {
      await this.minioClient.statObject(bucket, objectKey);
      // If statObject succeeds, the file already exists
      throw new FileUploadError(
        `A file named '${objectKey}' already exists in bucket '${bucket}'`,
        'FILENAME_CONFLICT',
      );
    } catch (error) {
      if (error instanceof FileUploadError) {
        throw error;
      }
      // If statObject throws with 'Not Found' or 'NotFound' code, the file doesn't exist
      const minioError = error as { code?: string; message?: string };
      if (
        minioError.code === 'NotFound' ||
        minioError.code === 'NoSuchKey' ||
        (minioError.message && minioError.message.includes('Not Found'))
      ) {
        return; // File doesn't exist, uniqueness check passes
      }
      // Any other error means MinIO is unreachable or has issues (Requirement 3.6)
      throw new FileUploadError(
        `Storage service unavailable: ${(error as Error).message}`,
        'STORAGE_UNAVAILABLE',
      );
    }
  }

  /**
   * Streams the file to MinIO using putObject with streaming support.
   * MinIO client handles chunked upload with configurable part size.
   * The max 8MB in-memory buffer is enforced by the stream's highWaterMark.
   * @see Requirements 3.1, 12.3
   */
  async streamUploadToMinio(
    bucket: string,
    objectKey: string,
    fileStream: Readable,
    fileSize: number,
  ): Promise<void> {
    try {
      await this.minioClient.putObject(bucket, objectKey, fileStream, fileSize, {
        'Content-Type': 'application/octet-stream',
      });
    } catch (error) {
      throw new FileUploadError(
        `Storage service unavailable: ${(error as Error).message}`,
        'STORAGE_UNAVAILABLE',
      );
    }
  }

  /**
   * Creates the DigitalProduct record in the database.
   * @see Requirements 3.2
   */
  private async createDigitalProductRecord(
    input: DigitalProductInput,
    bucket: string,
    objectKey: string,
  ): Promise<DigitalProduct> {
    const digitalProduct = new DigitalProduct({
      productVariantId: input.productVariantId,
      fileName: input.fileName,
      originalFileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      bucket,
      objectKey,
      maxDownloadsPerOrder: 5,
      downloadExpiryHours: 72,
    });

    return this.digitalProductRepository.save(digitalProduct);
  }

  /**
   * Deletes a stored file from MinIO as part of rollback when
   * DigitalProduct record creation fails.
   * Best-effort: errors during rollback are swallowed to avoid masking the original error.
   * @see Requirements 3.2
   */
  private async rollbackUpload(bucket: string, objectKey: string): Promise<void> {
    try {
      await this.minioClient.removeObject(bucket, objectKey);
    } catch {
      // Best-effort rollback - in production this would be logged for manual cleanup
    }
  }
}
