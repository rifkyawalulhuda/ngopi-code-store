import { DigitalProductInfoShopResolver } from './digital-product-info-shop.resolver';
import { DigitalProduct } from '../entities/digital-product.entity';

describe('DigitalProductInfoShopResolver', () => {
  const ctx: any = {};

  let findOne: jest.Mock;
  let connection: any;
  let resolver: DigitalProductInfoShopResolver;

  function digitalProduct(overrides: Partial<DigitalProduct> = {}): DigitalProduct {
    return {
      fileSize: 15_000_000,
      mimeType: 'application/zip',
      maxDownloadsPerOrder: 5,
      downloadExpiryHours: 72,
      bucket: 'products',
      objectKey: 'products/secret-key.zip',
      ...overrides,
    } as DigitalProduct;
  }

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue(null);
    connection = {
      rawConnection: {
        getRepository: jest.fn().mockReturnValue({ findOne }),
      },
    };
    resolver = new DigitalProductInfoShopResolver(connection);
  });

  it('returns file metadata for a variant that has an uploaded file', async () => {
    findOne.mockResolvedValue(digitalProduct());

    const info = await resolver.digitalProductInfo(ctx, { id: 42 as any });

    expect(info).toEqual({
      fileSize: 15_000_000,
      mimeType: 'application/zip',
      maxDownloadsPerOrder: 5,
      downloadExpiryHours: 72,
    });
  });

  it('never leaks the storage bucket or object key', async () => {
    findOne.mockResolvedValue(digitalProduct());

    const info = await resolver.digitalProductInfo(ctx, { id: 42 as any });

    expect(info).not.toHaveProperty('bucket');
    expect(info).not.toHaveProperty('objectKey');
    expect(JSON.stringify(info)).not.toContain('secret-key');
  });

  it('coerces a bigint fileSize to a number for GraphQL Float', async () => {
    // Postgres bigint columns are returned as strings by the driver.
    findOne.mockResolvedValue(digitalProduct({ fileSize: '15000000' as any }));

    const info = await resolver.digitalProductInfo(ctx, { id: 42 as any });

    expect(typeof info?.fileSize).toBe('number');
    expect(info?.fileSize).toBe(15_000_000);
  });

  it('returns null when the variant has no uploaded file', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      resolver.digitalProductInfo(ctx, { id: 42 as any }),
    ).resolves.toBeNull();
  });

  it('returns null without querying when the variant has no id', async () => {
    const info = await resolver.digitalProductInfo(ctx, { id: undefined as any });

    expect(info).toBeNull();
    expect(connection.rawConnection.getRepository).not.toHaveBeenCalled();
  });
});
