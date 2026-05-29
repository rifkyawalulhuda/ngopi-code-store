import { randomUUID } from 'crypto';
import {
  OrderFulfillmentService,
  DigitalProductLookup,
  DigitalDownloadPersistence,
  EmailSender,
  FulfillmentOrderData,
} from './order-fulfillment.service';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';

describe('OrderFulfillmentService', () => {
  let service: OrderFulfillmentService;
  let mockProductLookup: jest.Mocked<DigitalProductLookup>;
  let mockDownloadPersistence: jest.Mocked<DigitalDownloadPersistence>;
  let mockEmailSender: jest.Mocked<EmailSender>;
  const STOREFRONT_URL = 'https://store.ngopicode.com';

  function createFulfillmentOrder(overrides?: Partial<FulfillmentOrderData>): FulfillmentOrderData {
    return {
      id: '100',
      code: 'ORD-ABC123',
      customerId: '42',
      customerName: 'Budi',
      customerEmail: 'budi@example.com',
      lines: [
        { productVariantId: '1' },
        { productVariantId: '2' },
      ],
      totalWithTax: 150000,
      paymentMethod: 'QRIS',
      paidAt: new Date('2024-06-01T10:00:00Z'),
      ...overrides,
    };
  }

  function createDigitalProduct(variantId: string, overrides?: Partial<DigitalProduct>): DigitalProduct {
    return new DigitalProduct({
      id: parseInt(variantId) as any,
      productVariantId: variantId,
      fileName: `product-${variantId}.zip`,
      originalFileName: `product-${variantId}.zip`,
      fileSize: 1000000,
      mimeType: 'application/zip',
      bucket: 'products',
      objectKey: `product-${variantId}.zip`,
      maxDownloadsPerOrder: 5,
      downloadExpiryHours: 72,
      ...overrides,
    });
  }

  beforeEach(() => {
    mockProductLookup = {
      findByVariantId: jest.fn(),
    };
    mockDownloadPersistence = {
      save: jest.fn(),
      removeByOrderId: jest.fn(),
    };
    mockEmailSender = {
      sendOrderConfirmation: jest.fn(),
    };

    service = new OrderFulfillmentService(
      mockProductLookup,
      mockDownloadPersistence,
      mockEmailSender,
      STOREFRONT_URL,
    );
  });

  describe('processFulfillment', () => {
    it('should create download records for all digital line items', async () => {
      const order = createFulfillmentOrder();
      const product1 = createDigitalProduct('1');
      const product2 = createDigitalProduct('2');

      mockProductLookup.findByVariantId
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      const result = await service.processFulfillment(order);

      expect(result.downloadRecordsCreated).toBe(2);
      expect(mockDownloadPersistence.save).toHaveBeenCalledTimes(2);

      // Verify first download record
      const firstCall = mockDownloadPersistence.save.mock.calls[0][0];
      expect(firstCall.orderId).toBe('100');
      expect(firstCall.customerId).toBe('42');
      expect(firstCall.productVariantId).toBe('1');
      expect(firstCall.downloadToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(firstCall.maxDownloads).toBe(5);
      expect(firstCall.currentDownloads).toBe(0);
      expect(firstCall.isActive).toBe(true);
      expect(firstCall.expiresAt).toBeInstanceOf(Date);
    });

    it('should skip line items without DigitalProduct association', async () => {
      const order = createFulfillmentOrder({
        lines: [
          { productVariantId: '1' },
          { productVariantId: '2' },
          { productVariantId: '3' },
        ],
      });

      mockProductLookup.findByVariantId
        .mockResolvedValueOnce(createDigitalProduct('1'))
        .mockResolvedValueOnce(null) // No digital product for variant 2
        .mockResolvedValueOnce(createDigitalProduct('3'));

      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      const result = await service.processFulfillment(order);

      expect(result.downloadRecordsCreated).toBe(2);
      expect(mockDownloadPersistence.save).toHaveBeenCalledTimes(2);
    });

    it('should set expiry based on DigitalProduct.downloadExpiryHours', async () => {
      const order = createFulfillmentOrder({
        lines: [{ productVariantId: '1' }],
      });

      const product = createDigitalProduct('1', { downloadExpiryHours: 48 });
      mockProductLookup.findByVariantId.mockResolvedValue(product);
      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      const beforeTime = new Date();
      await service.processFulfillment(order);
      const afterTime = new Date();

      const savedRecord = mockDownloadPersistence.save.mock.calls[0][0];
      const expectedMinExpiry = new Date(beforeTime.getTime() + 48 * 60 * 60 * 1000);
      const expectedMaxExpiry = new Date(afterTime.getTime() + 48 * 60 * 60 * 1000);

      expect(savedRecord.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry.getTime());
      expect(savedRecord.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry.getTime());
    });

    it('should set maxDownloads from DigitalProduct.maxDownloadsPerOrder', async () => {
      const order = createFulfillmentOrder({
        lines: [{ productVariantId: '1' }],
      });

      const product = createDigitalProduct('1', { maxDownloadsPerOrder: 3 });
      mockProductLookup.findByVariantId.mockResolvedValue(product);
      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      await service.processFulfillment(order);

      const savedRecord = mockDownloadPersistence.save.mock.calls[0][0];
      expect(savedRecord.maxDownloads).toBe(3);
    });

    it('should send order confirmation email after creating download records', async () => {
      const order = createFulfillmentOrder();
      mockProductLookup.findByVariantId.mockResolvedValue(createDigitalProduct('1'));
      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      const result = await service.processFulfillment(order);

      expect(result.emailSent).toBe(true);
      expect(mockEmailSender.sendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Budi',
          customerEmail: 'budi@example.com',
          orderCode: 'ORD-ABC123',
          totalAmount: 150000,
          paymentMethod: 'QRIS',
          paidAt: order.paidAt,
        }),
      );

      // Verify download page URL is included
      const emailData = mockEmailSender.sendOrderConfirmation.mock.calls[0][0];
      expect(emailData.items[0].downloadUrl).toBe(
        `${STOREFRONT_URL}/downloads/ORD-ABC123`,
      );
    });

    it('should not rollback fulfillment when email fails (Req 6.4)', async () => {
      const order = createFulfillmentOrder({
        lines: [{ productVariantId: '1' }],
      });

      mockProductLookup.findByVariantId.mockResolvedValue(createDigitalProduct('1'));
      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await service.processFulfillment(order);

      // Download records still created
      expect(result.downloadRecordsCreated).toBe(1);
      // Email marked as not sent
      expect(result.emailSent).toBe(false);
      // No rollback attempted
      expect(mockDownloadPersistence.removeByOrderId).not.toHaveBeenCalled();
    });

    it('should rollback all download records on partial failure', async () => {
      const order = createFulfillmentOrder({
        lines: [
          { productVariantId: '1' },
          { productVariantId: '2' },
        ],
      });

      mockProductLookup.findByVariantId
        .mockResolvedValueOnce(createDigitalProduct('1'))
        .mockResolvedValueOnce(createDigitalProduct('2'));

      // First save succeeds, second fails
      mockDownloadPersistence.save
        .mockResolvedValueOnce(new DigitalDownload({ id: 1 as any }))
        .mockRejectedValueOnce(new Error('Database connection lost'));

      mockDownloadPersistence.removeByOrderId.mockResolvedValue(undefined);

      await expect(service.processFulfillment(order)).rejects.toThrow(
        'Database connection lost',
      );

      // Rollback was attempted
      expect(mockDownloadPersistence.removeByOrderId).toHaveBeenCalledWith('100');
    });

    it('should handle order with no digital items gracefully', async () => {
      const order = createFulfillmentOrder({
        lines: [
          { productVariantId: '1' },
          { productVariantId: '2' },
        ],
      });

      // No digital products found for any variant
      mockProductLookup.findByVariantId.mockResolvedValue(null);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      const result = await service.processFulfillment(order);

      expect(result.downloadRecordsCreated).toBe(0);
      expect(mockDownloadPersistence.save).not.toHaveBeenCalled();
      // Email is still sent even with no digital items
      expect(result.emailSent).toBe(true);
    });

    it('should generate unique download tokens for each record', async () => {
      const order = createFulfillmentOrder({
        lines: [
          { productVariantId: '1' },
          { productVariantId: '2' },
          { productVariantId: '3' },
        ],
      });

      mockProductLookup.findByVariantId.mockResolvedValue(createDigitalProduct('1'));
      mockDownloadPersistence.save.mockImplementation(async (entity) => entity);
      mockEmailSender.sendOrderConfirmation.mockResolvedValue(undefined);

      await service.processFulfillment(order);

      const tokens = mockDownloadPersistence.save.mock.calls.map(
        (call) => call[0].downloadToken,
      );
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });
});
