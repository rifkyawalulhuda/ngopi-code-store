import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, TransactionalConnection, ID, ForbiddenError } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { MinioService } from '../services/minio.service';

/**
 * Shop API resolver for customer download access.
 * Generates short-lived pre-signed URLs for authenticated product owners.
 */
@Resolver()
export class DigitalProductShopResolver {
  constructor(
    private connection: TransactionalConnection,
    private minioService: MinioService,
  ) {}

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
