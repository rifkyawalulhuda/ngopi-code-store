import { ResolveField, Resolver, Parent } from '@nestjs/graphql';
import { Ctx, ID, RequestContext, TransactionalConnection } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';

/** Public digital-file metadata shape exposed on the Shop API. */
export interface DigitalProductInfo {
  fileSize: number;
  mimeType: string;
  maxDownloadsPerOrder: number;
  downloadExpiryHours: number;
}

/**
 * Exposes public digital-file metadata on `ProductVariant` so the storefront can
 * tell shoppers what they are buying (file size, format, download limits).
 *
 * Deliberately returns ONLY non-sensitive fields — the storage `bucket` and
 * `objectKey` are never exposed through the Shop API.
 */
@Resolver('ProductVariant')
export class DigitalProductInfoShopResolver {
  constructor(private connection: TransactionalConnection) {}

  @ResolveField()
  async digitalProductInfo(
    @Ctx() _ctx: RequestContext,
    @Parent() variant: { id: ID },
  ): Promise<DigitalProductInfo | null> {
    if (!variant?.id) {
      return null;
    }

    const digitalProduct = await this.connection.rawConnection
      .getRepository(DigitalProduct)
      .findOne({ where: { productVariantId: variant.id as any } });

    if (!digitalProduct) {
      return null;
    }

    return {
      // fileSize is a bigint column — coerce so it maps cleanly to GraphQL Float.
      fileSize: Number(digitalProduct.fileSize),
      mimeType: digitalProduct.mimeType,
      maxDownloadsPerOrder: digitalProduct.maxDownloadsPerOrder,
      downloadExpiryHours: digitalProduct.downloadExpiryHours,
    };
  }
}
