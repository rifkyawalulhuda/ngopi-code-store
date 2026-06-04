import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext, Transaction, TransactionalConnection, ID } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { MinioService } from '../services/minio.service';
import crypto from 'crypto';
import path from 'path';

/**
 * Admin API resolver for managing digital product files.
 * Allows admins to upload files to MinIO and link them to product variants.
 */
@Resolver()
export class DigitalProductAdminResolver {
  constructor(
    private connection: TransactionalConnection,
    private minioService: MinioService,
  ) {}

  @Query()
  @Allow(Permission.ReadCatalog)
  async digitalProductByVariantId(
    @Ctx() ctx: RequestContext,
    @Args() args: { variantId: ID },
  ): Promise<DigitalProduct | null> {
    return this.connection.rawConnection
      .getRepository(DigitalProduct)
      .findOne({ where: { productVariantId: args.variantId as any } });
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateCatalog)
  async uploadDigitalProduct(
    @Ctx() ctx: RequestContext,
    @Args() args: { variantId: ID; file: any },
  ): Promise<DigitalProduct> {
    const { variantId, file } = args;
    const { createReadStream, filename, mimetype } = await file;

    // Read file into buffer
    const chunks: Buffer[] = [];
    const stream = createReadStream();
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);

    // Upload to MinIO
    const { objectKey, bucket, fileSize } = await this.minioService.uploadFile(
      fileBuffer,
      filename,
      mimetype,
    );

    // Generate unique fileName for the record
    const ext = path.extname(filename);
    const uniqueFileName = `${crypto.randomUUID()}${ext}`;

    // Check if a digital product already exists for this variant
    const repo = this.connection.rawConnection.getRepository(DigitalProduct);
    const existing = await repo.findOne({ where: { productVariantId: variantId as any } });

    if (existing) {
      // Delete old file from MinIO
      try {
        await this.minioService.deleteFile(existing.objectKey);
      } catch { /* old file might not exist */ }

      // Update existing record
      existing.fileName = uniqueFileName;
      existing.originalFileName = filename;
      existing.fileSize = fileSize;
      existing.mimeType = mimetype;
      existing.bucket = bucket;
      existing.objectKey = objectKey;
      return repo.save(existing);
    }

    // Create new digital product record
    const digitalProduct = repo.create({
      productVariantId: variantId as any,
      fileName: uniqueFileName,
      originalFileName: filename,
      fileSize,
      mimeType: mimetype,
      bucket,
      objectKey,
      maxDownloadsPerOrder: 999, // unlimited
      downloadExpiryHours: 168, // not enforced but keep a value
    });

    return repo.save(digitalProduct) as any;
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.DeleteCatalog)
  async deleteDigitalProduct(
    @Ctx() ctx: RequestContext,
    @Args() args: { variantId: ID },
  ): Promise<boolean> {
    const repo = this.connection.rawConnection.getRepository(DigitalProduct);
    const existing = await repo.findOne({ where: { productVariantId: args.variantId as any } });
    if (!existing) return false;

    // Delete from MinIO
    try {
      await this.minioService.deleteFile(existing.objectKey);
    } catch { /* ignore */ }

    await repo.remove(existing);
    return true;
  }
}
