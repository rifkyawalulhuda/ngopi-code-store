import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { DigitalProduct } from './entities/digital-product.entity';
import { DigitalDownload } from './entities/digital-download.entity';
import { MinioService } from './services/minio.service';
import { DigitalProductAdminResolver } from './api/digital-product-admin.resolver';
import { DigitalProductShopResolver } from './api/digital-product-shop.resolver';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';

/**
 * DigitalFulfillmentPlugin
 *
 * Provides:
 * - MinIO file storage integration (upload/download)
 * - Admin API: uploadDigitalProduct, deleteDigitalProduct, digitalProductByVariantId
 * - Shop API: generateDownloadUrl (authenticated, ownership-validated, 5-min presigned URL)
 * - Entities: DigitalProduct (file metadata), DigitalDownload (download records)
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [DigitalProduct, DigitalDownload],
  providers: [MinioService],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [DigitalProductAdminResolver],
  },
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [DigitalProductShopResolver],
  },
  compatibility: '^3.0.0',
})
export class DigitalFulfillmentPlugin {}
