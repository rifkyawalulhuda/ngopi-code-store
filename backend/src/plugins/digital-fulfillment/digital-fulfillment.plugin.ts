import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { DigitalProduct } from './entities/digital-product.entity';
import { DigitalDownload } from './entities/digital-download.entity';
import { MinioService } from './services/minio.service';
import { OrderFulfillmentRunner } from './services/order-fulfillment-runner.service';
import { OrderFulfillmentQueue } from './services/order-fulfillment-queue.service';
import { OrderReceiptEmailService } from './services/order-receipt-email.service';
import { DigitalProductAdminResolver } from './api/digital-product-admin.resolver';
import { DigitalProductShopResolver } from './api/digital-product-shop.resolver';
import { DigitalProductInfoShopResolver } from './api/digital-product-info-shop.resolver';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { GuestCheckoutPlugin } from '../guest-checkout/guest-checkout.plugin';
import { WhatsappPlugin } from '../whatsapp/whatsapp.plugin';

/**
 * DigitalFulfillmentPlugin
 *
 * Provides:
 * - MinIO file storage integration (upload/download)
 * - Admin API: uploadDigitalProduct, deleteDigitalProduct, digitalProductByVariantId
 * - Shop API: generateDownloadUrl (authenticated, ownership-validated, 5-min presigned URL)
 * - Shop API: ProductVariant.digitalProductInfo (public file size/format/limits)
 * - Entities: DigitalProduct (file metadata), DigitalDownload (download records)
 * - Fulfillment: OrderFulfillmentRunner (hidden guest User + downloads + receipt email)
 */
@VendurePlugin({
  imports: [PluginCommonModule, GuestCheckoutPlugin, WhatsappPlugin],
  entities: [DigitalProduct, DigitalDownload],
  providers: [
    MinioService,
    OrderFulfillmentRunner,
    OrderFulfillmentQueue,
    OrderReceiptEmailService,
  ],
  exports: [OrderFulfillmentRunner, OrderFulfillmentQueue, OrderReceiptEmailService],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [DigitalProductAdminResolver],
  },
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [DigitalProductShopResolver, DigitalProductInfoShopResolver],
  },
  compatibility: '^3.0.0',
})
export class DigitalFulfillmentPlugin {}
