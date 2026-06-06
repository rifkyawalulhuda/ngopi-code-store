import { Args, Mutation, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Ctx, RequestContext, TransactionalConnection, ID, ForbiddenError, Order } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';
import { MinioService } from '../services/minio.service';

/**
 * Shop API resolver for customer download access.
 * Generates short-lived pre-signed URLs for authenticated product owners.
 */
@Resolver('Order')
export class DigitalProductShopResolver {
  constructor(
    private connection: TransactionalConnection,
    private minioService: MinioService,
  ) {}

  /**
   * Resolve downloads field on Order type.
   * Returns digital download records for the order, enriched with fileName from DigitalProduct.
   */
  @ResolveField()
  async downloads(
    @Ctx() ctx: RequestContext,
    @Parent() order: Order,
  ): Promise<Array<{ id: ID; fileName: string; maxDownloads: number; currentDownloads: number; expiresAt: string; isActive: boolean; downloadToken: string }>> {
    if (!ctx.activeUserId) {
      return [];
    }

    const downloadRecords = await this.connection.rawConnection
      .getRepository(DigitalDownload)
      .find({ where: { orderId: order.id as any } });

    if (!downloadRecords.length) {
      return [];
    }

    // Batch query all digital products for the variant IDs (avoid N+1)
    const variantIds = downloadRecords.map(dl => dl.productVariantId);
    const digitalProducts = await this.connection.rawConnection
      .getRepository(DigitalProduct)
      .createQueryBuilder('dp')
      .where('dp.productVariantId IN (:...variantIds)', { variantIds })
      .getMany();

    const productMap = new Map(
      digitalProducts.map(dp => [String(dp.productVariantId), dp]),
    );

    return downloadRecords.map(dl => ({
      id: dl.id,
      fileName: productMap.get(String(dl.productVariantId))?.originalFileName || 'file.zip',
      maxDownloads: dl.maxDownloads,
      currentDownloads: dl.currentDownloads,
      expiresAt: dl.expiresAt instanceof Date ? dl.expiresAt.toISOString() : String(dl.expiresAt),
      isActive: dl.isActive,
      downloadToken: dl.downloadToken,
    }));
  }

  /**
   * Request a download link using a download token.
   * Validates ownership, increments download count, returns pre-signed URL.
   */
  @Mutation()
  async requestDownloadLink(
    @Ctx() ctx: RequestContext,
    @Args() args: { downloadToken: string },
  ): Promise<{ url: string; expiresIn: number; remainingDownloads: number; fileName: string } | null> {
    if (!ctx.activeUserId) {
      throw new ForbiddenError();
    }

    const { downloadToken } = args;

    const downloadRecord = await this.connection.rawConnection
      .getRepository(DigitalDownload)
      .findOne({ where: { downloadToken } });

    if (!downloadRecord) {
      return null;
    }

    // Verify ownership: the download must belong to the current user
    const ownershipCheck = await this.connection.rawConnection.query(
      `SELECT c.id FROM customer c
       JOIN "user" u ON c."userId" = u.id
       WHERE u.id = $1 AND c.id = $2
       LIMIT 1`,
      [ctx.activeUserId, downloadRecord.customerId],
    );

    if (!ownershipCheck || ownershipCheck.length === 0) {
      throw new ForbiddenError();
    }

    // Check if download is accessible
    if (!downloadRecord.isAccessible()) {
      return null;
    }

    // Increment download count
    downloadRecord.currentDownloads += 1;
    downloadRecord.lastDownloadedAt = new Date();
    await this.connection.rawConnection.getRepository(DigitalDownload).save(downloadRecord);

    // Get file info
    const digitalProduct = await this.connection.rawConnection
      .getRepository(DigitalProduct)
      .findOne({ where: { productVariantId: downloadRecord.productVariantId as any } });

    if (!digitalProduct) {
      return null;
    }

    // Generate pre-signed URL (5 minutes)
    const url = await this.minioService.getPresignedDownloadUrl(
      digitalProduct.objectKey,
      digitalProduct.originalFileName,
      300,
    );

    return {
      url,
      expiresIn: 300,
      remainingDownloads: downloadRecord.maxDownloads - downloadRecord.currentDownloads,
      fileName: digitalProduct.originalFileName,
    };
  }

  /**
   * Generate a download URL for a digital product.
   * Validates: user is authenticated + owns the product via a paid order.
   * Returns a pre-signed MinIO URL (5 min expiry).
   */
  @Mutation()
  async generateDownloadUrl(
    @Ctx() ctx: RequestContext,
    @Args() args: { productVariantId: ID },
  ): Promise<{ url: string; fileName: string } | null> {
    // Must be authenticated
    if (!ctx.activeUserId) {
      throw new ForbiddenError();
    }

    const { productVariantId } = args;

    // Check if user owns this product (has a paid/fulfilled order with this variant)
    const ownershipCheck = await this.connection.rawConnection.query(
      `SELECT o.id FROM "order" o
       JOIN order_line ol ON ol."orderId" = o.id
       JOIN product_variant pv ON ol."productVariantId" = pv.id
       JOIN customer c ON o."customerId" = c.id
       JOIN "user" u ON c."userId" = u.id
       WHERE u.id = $1
         AND pv.id = $2
         AND o.state IN ('PaymentSettled', 'Fulfilled', 'Delivered')
       LIMIT 1`,
      [ctx.activeUserId, productVariantId],
    );

    if (!ownershipCheck || ownershipCheck.length === 0) {
      throw new ForbiddenError();
    }

    // Get the digital product file info
    const digitalProduct = await this.connection.rawConnection
      .getRepository(DigitalProduct)
      .findOne({ where: { productVariantId: productVariantId as any } });

    if (!digitalProduct) {
      return null; // No file uploaded for this product
    }

    // Generate pre-signed URL (5 minutes)
    const url = await this.minioService.getPresignedDownloadUrl(
      digitalProduct.objectKey,
      digitalProduct.originalFileName,
      300, // 5 minutes
    );

    return {
      url,
      fileName: digitalProduct.originalFileName,
    };
  }
}
