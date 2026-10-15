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
    // Trim: a stray trailing space in .env / a Docker `-e` flag otherwise
    // produces "Invalid bucket name" on every upload — a very confusing failure.
    this.bucket = (process.env.MINIO_BUCKET_NAME || 'products').trim();
  }

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint: (process.env.MINIO_ENDPOINT || 'localhost').trim(),
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: (process.env.MINIO_ACCESS_KEY || 'minioadmin').trim(),
      secretKey: (process.env.MINIO_SECRET_KEY || 'minioadmin').trim(),
    });
    await this.ensureBucket();
    Logger.info('MinIO client initialized', loggerCtx);
  }

  /**
   * Creates the bucket when it does not exist yet.
   *
   * Uploads fail with a bare "The specified bucket does not exist" otherwise,
   * which is easy to misread as a credentials problem. In production the
   * `minio-init` compose service creates it, but nothing does so for a plain
   * local `npm run dev` — so a fresh environment silently cannot accept files.
   *
   * A bucket created by MinIO is private by default; anonymous access is never
   * granted here (see `src/config/security.ts`).
   *
   * Never blocks startup: if MinIO is unreachable the server still boots and
   * the failure surfaces when an upload is attempted.
   */
  private async ensureBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (exists) {
        return;
      }
      await this.client.makeBucket(this.bucket);
      Logger.info(`Created MinIO bucket "${this.bucket}" (private)`, loggerCtx);
    } catch (error) {
      Logger.warn(
        `Could not verify/create MinIO bucket "${this.bucket}": ${(error as Error).message}. ` +
          `File uploads will fail until the bucket exists.`,
        loggerCtx,
      );
    }
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
