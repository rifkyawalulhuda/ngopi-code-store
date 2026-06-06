import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@vendure/core';
import * as Minio from 'minio';
import { Readable } from 'stream';
import crypto from 'crypto';
import path from 'path';

const loggerCtx = 'MinioService';

/**
 * Service for interacting with MinIO object storage.
 * Handles file uploads and pre-signed URL generation for downloads.
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private client!: Minio.Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET_NAME || 'products';
  }

  onModuleInit() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    Logger.info('MinIO client initialized', loggerCtx);
  }

  /**
   * Upload a file buffer to MinIO.
   * Returns the generated object key.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ): Promise<{ objectKey: string; bucket: string; fileSize: number }> {
    // Generate unique object key: digital/{uuid}-{sanitized-filename}
    const ext = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const uniqueId = crypto.randomUUID();
    const objectKey = `digital/${uniqueId}-${baseName}${ext}`;

    const stream = Readable.from(fileBuffer);
    const fileSize = fileBuffer.length;

    await this.client.putObject(
      this.bucket,
      objectKey,
      stream,
      fileSize,
      { 'Content-Type': mimeType },
    );

    Logger.info(`Uploaded file: ${objectKey} (${fileSize} bytes)`, loggerCtx);

    return { objectKey, bucket: this.bucket, fileSize };
  }

  /**
   * Generate a pre-signed GET URL for downloading a file.
   * URL expires after the specified seconds (default: 300 = 5 minutes).
   * Uses public endpoint if MINIO_PUBLIC_URL is configured (for external access).
   */
  async getPresignedDownloadUrl(
    objectKey: string,
    originalFileName: string,
    expirySeconds = 300,
  ): Promise<string> {
    // Use a separate client configured with public endpoint for signing
    // This ensures the signature matches the hostname users will access
    const publicUrl = process.env.MINIO_PUBLIC_URL;
    let signingClient = this.client;

    if (publicUrl) {
      try {
        const parsed = new URL(publicUrl);
        signingClient = new Minio.Client({
          endPoint: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80),
          useSSL: parsed.protocol === 'https:',
          accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
      } catch {
        // Fallback to default client if URL parsing fails
        signingClient = this.client;
      }
    }

    const url = await signingClient.presignedGetObject(
      this.bucket,
      objectKey,
      expirySeconds,
      {
        'response-content-disposition': `attachment; filename="${encodeURIComponent(originalFileName)}"`,
      },
    );

    return url;
  }

  /**
   * Delete a file from MinIO.
   */
  async deleteFile(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
    Logger.info(`Deleted file: ${objectKey}`, loggerCtx);
  }
}
