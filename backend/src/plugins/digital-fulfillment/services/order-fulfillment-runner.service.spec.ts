import { Logger, Order } from '@vendure/core';
import { OrderFulfillmentRunner } from './order-fulfillment-runner.service';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';

/**
 * Focused tests for the missing-file guard.
 *
 * A paid line whose variant has no uploaded file used to be skipped silently,
 * producing a paid order with zero downloads and no signal. It must now be
 * logged as an error and reported in the result.
 */
describe('OrderFulfillmentRunner — missing file guard', () => {
  const ctx: any = {};

  let runner: OrderFulfillmentRunner;
  let productFindOne: jest.Mock;
  let downloadFindOne: jest.Mock;
  let downloadSave: jest.Mock;

  function makeOrder(lineVariantIds: number[]) {
    return {
      id: 100,
      code: 'ORD-TEST-1',
      customer: {
        id: 42,
        emailAddress: 'budi@example.com',
        firstName: 'Budi',
        lastName: '',
        // A non-guest customer: `user` present, so no hidden-user creation.
        user: { id: 7 },
        customFields: {},
      },
      lines: lineVariantIds.map((variantId, i) => ({
        id: i + 1,
        productVariantId: variantId,
        productVariant: { name: `Produk - ${variantId === 10 ? 'Personal' : 'Extended'}` },
        proratedUnitPriceWithTax: 1000,
        listPrice: 1000,
      })),
      payments: [{ method: 'tripay' }],
      totalWithTax: 4000,
    };
  }

  beforeEach(() => {
    productFindOne = jest.fn();
    downloadFindOne = jest.fn().mockResolvedValue(null);
    downloadSave = jest.fn().mockImplementation(async (e) => e);

    const connection: any = {
      getRepository: jest.fn((_ctx: any, entity: unknown) => {
        if (entity === Order) {
          return { findOne: jest.fn().mockResolvedValue(makeOrder([10, 11])) };
        }
        if (entity === DigitalProduct) return { findOne: productFindOne };
        if (entity === DigitalDownload) return { findOne: downloadFindOne, save: downloadSave };
        throw new Error('Unexpected entity in test');
      }),
    };

    runner = new OrderFulfillmentRunner(
      connection,
      { ensureHiddenUser: jest.fn() } as any,
      { issue: jest.fn().mockResolvedValue('token') } as any,
      { sendOrderConfirmation: jest.fn().mockResolvedValue(true) } as any,
      { sendOrderConfirmation: jest.fn().mockResolvedValue({ sent: true }) } as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a download for a variant that has a file, and reports the one that does not', async () => {
    // Variant 10 has a file; variant 11 (Extended) does not.
    productFindOne.mockImplementation(async ({ where }: any) =>
      where.productVariantId === 10
        ? new DigitalProduct({
            productVariantId: 10,
            fileName: 'p.zip',
            originalFileName: 'p.zip',
            fileSize: 1000,
            mimeType: 'application/zip',
            bucket: 'products',
            objectKey: 'p.zip',
            maxDownloadsPerOrder: 5,
            downloadExpiryHours: 72,
          })
        : null,
    );

    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const result = await runner.run(ctx, 100);

    expect(result.downloadRecordsCreated).toBe(1);
    expect(downloadSave).toHaveBeenCalledTimes(1);
    expect(result.missingFiles).toEqual(['Produk - Extended']);
    // The undeliverable item must be loud, not silent.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Produk - Extended'),
      expect.any(String),
    );
  });

  it('reports no missing files when every variant has a file', async () => {
    productFindOne.mockImplementation(
      async ({ where }: any) =>
        new DigitalProduct({
          productVariantId: where.productVariantId,
          fileName: 'p.zip',
          originalFileName: 'p.zip',
          fileSize: 1000,
          mimeType: 'application/zip',
          bucket: 'products',
          objectKey: 'p.zip',
          maxDownloadsPerOrder: 5,
          downloadExpiryHours: 72,
        }),
    );

    const result = await runner.run(ctx, 100);

    expect(result.downloadRecordsCreated).toBe(2);
    expect(result.missingFiles).toEqual([]);
  });
});
