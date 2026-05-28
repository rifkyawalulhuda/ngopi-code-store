import { DigitalProduct } from './digital-product.entity';
import { validate } from 'class-validator';

describe('DigitalProduct Entity', () => {
  function createValidDigitalProduct(): DigitalProduct {
    const product = new DigitalProduct();
    product.productVariantId = 1;
    product.fileName = 'nuxt-starter-kit-v1.zip';
    product.originalFileName = 'Nuxt Starter Kit v1.zip';
    product.fileSize = 15_000_000;
    product.mimeType = 'application/zip';
    product.bucket = 'products';
    product.objectKey = 'products/nuxt-starter-kit-v1.zip';
    product.maxDownloadsPerOrder = 5;
    product.downloadExpiryHours = 72;
    return product;
  }

  describe('constructor', () => {
    it('should create an instance with DeepPartial input', () => {
      const product = new DigitalProduct({
        fileName: 'test.zip',
        originalFileName: 'Test File.zip',
        fileSize: 1000,
        mimeType: 'application/zip',
        bucket: 'products',
        objectKey: 'products/test.zip',
      });

      expect(product.fileName).toBe('test.zip');
      expect(product.originalFileName).toBe('Test File.zip');
      expect(product.fileSize).toBe(1000);
      expect(product.mimeType).toBe('application/zip');
      expect(product.bucket).toBe('products');
      expect(product.objectKey).toBe('products/test.zip');
    });

    it('should create an instance with default values', () => {
      const product = new DigitalProduct();
      expect(product).toBeInstanceOf(DigitalProduct);
    });
  });

  describe('validation - maxDownloadsPerOrder', () => {
    it('should pass validation with value 1 (minimum)', async () => {
      const product = createValidDigitalProduct();
      product.maxDownloadsPerOrder = 1;
      const errors = await validate(product);
      const maxDownloadErrors = errors.filter(
        (e) => e.property === 'maxDownloadsPerOrder',
      );
      expect(maxDownloadErrors).toHaveLength(0);
    });

    it('should pass validation with value 10 (maximum)', async () => {
      const product = createValidDigitalProduct();
      product.maxDownloadsPerOrder = 10;
      const errors = await validate(product);
      const maxDownloadErrors = errors.filter(
        (e) => e.property === 'maxDownloadsPerOrder',
      );
      expect(maxDownloadErrors).toHaveLength(0);
    });

    it('should pass validation with value 5 (default)', async () => {
      const product = createValidDigitalProduct();
      product.maxDownloadsPerOrder = 5;
      const errors = await validate(product);
      const maxDownloadErrors = errors.filter(
        (e) => e.property === 'maxDownloadsPerOrder',
      );
      expect(maxDownloadErrors).toHaveLength(0);
    });

    it('should fail validation with value 0 (below minimum)', async () => {
      const product = createValidDigitalProduct();
      product.maxDownloadsPerOrder = 0;
      const errors = await validate(product);
      const maxDownloadErrors = errors.filter(
        (e) => e.property === 'maxDownloadsPerOrder',
      );
      expect(maxDownloadErrors.length).toBeGreaterThan(0);
    });

    it('should fail validation with value 11 (above maximum)', async () => {
      const product = createValidDigitalProduct();
      product.maxDownloadsPerOrder = 11;
      const errors = await validate(product);
      const maxDownloadErrors = errors.filter(
        (e) => e.property === 'maxDownloadsPerOrder',
      );
      expect(maxDownloadErrors.length).toBeGreaterThan(0);
    });
  });

  describe('validation - downloadExpiryHours', () => {
    it('should pass validation with value 1 (minimum)', async () => {
      const product = createValidDigitalProduct();
      product.downloadExpiryHours = 1;
      const errors = await validate(product);
      const expiryErrors = errors.filter(
        (e) => e.property === 'downloadExpiryHours',
      );
      expect(expiryErrors).toHaveLength(0);
    });

    it('should pass validation with value 168 (maximum - 7 days)', async () => {
      const product = createValidDigitalProduct();
      product.downloadExpiryHours = 168;
      const errors = await validate(product);
      const expiryErrors = errors.filter(
        (e) => e.property === 'downloadExpiryHours',
      );
      expect(expiryErrors).toHaveLength(0);
    });

    it('should pass validation with value 72 (default)', async () => {
      const product = createValidDigitalProduct();
      product.downloadExpiryHours = 72;
      const errors = await validate(product);
      const expiryErrors = errors.filter(
        (e) => e.property === 'downloadExpiryHours',
      );
      expect(expiryErrors).toHaveLength(0);
    });

    it('should fail validation with value 0 (below minimum)', async () => {
      const product = createValidDigitalProduct();
      product.downloadExpiryHours = 0;
      const errors = await validate(product);
      const expiryErrors = errors.filter(
        (e) => e.property === 'downloadExpiryHours',
      );
      expect(expiryErrors.length).toBeGreaterThan(0);
    });

    it('should fail validation with value 169 (above maximum)', async () => {
      const product = createValidDigitalProduct();
      product.downloadExpiryHours = 169;
      const errors = await validate(product);
      const expiryErrors = errors.filter(
        (e) => e.property === 'downloadExpiryHours',
      );
      expect(expiryErrors.length).toBeGreaterThan(0);
    });
  });
});
