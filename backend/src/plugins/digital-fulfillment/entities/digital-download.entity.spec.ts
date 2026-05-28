import { DigitalDownload } from './digital-download.entity';

describe('DigitalDownload Entity', () => {
  function createDownload(overrides: Partial<DigitalDownload> = {}): DigitalDownload {
    const download = new DigitalDownload({
      orderId: 1 as any,
      customerId: 1 as any,
      productVariantId: 1 as any,
      downloadToken: '550e8400-e29b-41d4-a716-446655440000',
      maxDownloads: 5,
      currentDownloads: 0,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
      lastDownloadedAt: null,
      isActive: true,
      ...overrides,
    });
    return download;
  }

  describe('isDownloadCountValid()', () => {
    it('should return true when currentDownloads is less than maxDownloads', () => {
      const download = createDownload({ currentDownloads: 3, maxDownloads: 5 });
      expect(download.isDownloadCountValid()).toBe(true);
    });

    it('should return true when currentDownloads equals maxDownloads', () => {
      const download = createDownload({ currentDownloads: 5, maxDownloads: 5 });
      expect(download.isDownloadCountValid()).toBe(true);
    });

    it('should return false when currentDownloads exceeds maxDownloads', () => {
      const download = createDownload({ currentDownloads: 6, maxDownloads: 5 });
      expect(download.isDownloadCountValid()).toBe(false);
    });

    it('should return true when both are 0', () => {
      const download = createDownload({ currentDownloads: 0, maxDownloads: 0 });
      expect(download.isDownloadCountValid()).toBe(true);
    });
  });

  describe('isExpired()', () => {
    it('should return false when expiresAt is in the future', () => {
      const download = createDownload({
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });
      expect(download.isExpired()).toBe(false);
    });

    it('should return true when expiresAt is in the past', () => {
      const download = createDownload({
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });
      expect(download.isExpired()).toBe(true);
    });
  });

  describe('isLimitReached()', () => {
    it('should return false when currentDownloads is less than maxDownloads', () => {
      const download = createDownload({ currentDownloads: 3, maxDownloads: 5 });
      expect(download.isLimitReached()).toBe(false);
    });

    it('should return true when currentDownloads equals maxDownloads', () => {
      const download = createDownload({ currentDownloads: 5, maxDownloads: 5 });
      expect(download.isLimitReached()).toBe(true);
    });

    it('should return true when currentDownloads exceeds maxDownloads', () => {
      const download = createDownload({ currentDownloads: 6, maxDownloads: 5 });
      expect(download.isLimitReached()).toBe(true);
    });
  });

  describe('isAccessible()', () => {
    it('should return true when active, not expired, and not at limit', () => {
      const download = createDownload({
        isActive: true,
        currentDownloads: 2,
        maxDownloads: 5,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      expect(download.isAccessible()).toBe(true);
    });

    it('should return false when isActive is false', () => {
      const download = createDownload({
        isActive: false,
        currentDownloads: 2,
        maxDownloads: 5,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      expect(download.isAccessible()).toBe(false);
    });

    it('should return false when expired', () => {
      const download = createDownload({
        isActive: true,
        currentDownloads: 2,
        maxDownloads: 5,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });
      expect(download.isAccessible()).toBe(false);
    });

    it('should return false when download limit reached', () => {
      const download = createDownload({
        isActive: true,
        currentDownloads: 5,
        maxDownloads: 5,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      expect(download.isAccessible()).toBe(false);
    });

    it('should return false when all conditions fail', () => {
      const download = createDownload({
        isActive: false,
        currentDownloads: 5,
        maxDownloads: 5,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });
      expect(download.isAccessible()).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create entity with default values', () => {
      const download = new DigitalDownload();
      // Default values are set by TypeORM column decorators, not constructor
      // Just verify the entity can be instantiated
      expect(download).toBeInstanceOf(DigitalDownload);
    });

    it('should create entity with provided values', () => {
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const download = new DigitalDownload({
        orderId: 42 as any,
        customerId: 7 as any,
        productVariantId: 15 as any,
        downloadToken: '550e8400-e29b-41d4-a716-446655440000',
        maxDownloads: 3,
        currentDownloads: 0,
        expiresAt,
        lastDownloadedAt: null,
        isActive: true,
      });

      expect(download.orderId).toBe(42);
      expect(download.customerId).toBe(7);
      expect(download.productVariantId).toBe(15);
      expect(download.downloadToken).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(download.maxDownloads).toBe(3);
      expect(download.currentDownloads).toBe(0);
      expect(download.expiresAt).toBe(expiresAt);
      expect(download.lastDownloadedAt).toBeNull();
      expect(download.isActive).toBe(true);
    });
  });
});
