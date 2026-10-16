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
 *
 * Services (jasa) are the deliberate exception: they have no file by design, so
 * they must not be reported as undeliverable.
 */
describe('OrderFulfillmentRunner — missing file guard', () => {
  const ctx: any = {};

  let runner: OrderFulfillmentRunner;
  let productFindOne: jest.Mock;
  let downloadFindOne: jest.Mock;
  let downloadSave: jest.Mock;
  let orderLines: any[];

  const SERVICE_FACETS = [
    { code: 'jasa', facet: { code: 'product-category' } },
    { code: 'repeatable', facet: { code: 'purchase-rule' } },
  ];
  const DIGITAL_FACETS = [
    { code: 'source-code', facet: { code: 'product-category' } },
    { code: 'one-time', facet: { code: 'purchase-rule' } },
  ];

  function line(variantId: number, name: string, facetValues: any[] = DIGITAL_FACETS) {
    return {
      id: variantId,
      productVariantId: variantId,
      productVariant: { name, product: { facetValues } },
      proratedUnitPriceWithTax: 1000,
      listPrice: 1000,
    };
  }

  function makeOrder() {
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
      lines: orderLines,
      payments: [{ method: 'tripay' }],
      totalWithTax: 4000,
    };
  }

  beforeEach(() => {
    productFindOne = jest.fn();
    downloadFindOne = jest.fn().mockResolvedValue(null);
    downloadSave = jest.fn().mockImplementation(async (e) => e);

    orderLines = [
      line(10, 'Produk - Personal'),
      line(11, 'Produk - Extended'),
    ];

    const connection: any = {
      getRepository: jest.fn((_ctx: any, entity: unknown) => {
        if (entity === Order) {
          return { findOne: jest.fn().mockImplementation(async () => makeOrder()) };
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

  function digitalProduct(variantId: number) {
    return new DigitalProduct({
      productVariantId: variantId,
      fileName: 'p.zip',
      originalFileName: 'p.zip',
      fileSize: 1000,
      mimeType: 'application/zip',
      bucket: 'products',
      objectKey: 'p.zip',
      maxDownloadsPerOrder: 5,
      downloadExpiryHours: 72,
    });
  }

  it('creates a download for a variant that has a file, and reports the one that does not', async () => {
    // Variant 10 has a file; variant 11 (Extended) does not.
    productFindOne.mockImplementation(async ({ where }: any) =>
      where.productVariantId === 10 ? digitalProduct(10) : null,
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
    productFindOne.mockImplementation(async ({ where }: any) =>
      digitalProduct(where.productVariantId),
    );

    const result = await runner.run(ctx, 100);

    expect(result.downloadRecordsCreated).toBe(2);
    expect(result.missingFiles).toEqual([]);
  });

  it('does NOT treat a fileless service variant as undeliverable', async () => {
    // A jasa product: no file exists, and none is expected.
    orderLines = [
      line(22, 'JASA-WEB-LITE', SERVICE_FACETS),
      line(23, 'JASA-WEB-STANDAR', SERVICE_FACETS),
    ];
    productFindOne.mockResolvedValue(null);

    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const result = await runner.run(ctx, 100);

    expect(result.downloadRecordsCreated).toBe(0);
    expect(result.missingFiles).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Undeliverable'),
      expect.any(String),
    );
  });

  it('recognises a service from the repeatable facet alone', async () => {
    orderLines = [
      line(22, 'JASA-WEB-LITE', [{ code: 'repeatable', facet: { code: 'purchase-rule' } }]),
    ];
    productFindOne.mockResolvedValue(null);

    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const result = await runner.run(ctx, 100);

    expect(result.missingFiles).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Undeliverable'),
      expect.any(String),
    );
  });

  it('recognises a service from the legacy product-type facet', async () => {
    orderLines = [
      line(4, 'Konsultasi Arsitektur Sistem', [{ code: 'service', facet: { code: 'product-type' } }]),
    ];
    productFindOne.mockResolvedValue(null);

    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const result = await runner.run(ctx, 100);

    expect(result.missingFiles).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Undeliverable'),
      expect.any(String),
    );
  });

  it('still flags a digital product missing its file', async () => {
    orderLines = [line(8, 'Sistem Informasi Perpustakaan', DIGITAL_FACETS)];
    productFindOne.mockResolvedValue(null);

    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const result = await runner.run(ctx, 100);

    expect(result.missingFiles).toEqual(['Sistem Informasi Perpustakaan']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Undeliverable'),
      expect.any(String),
    );
  });
});
