import * as fc from 'fast-check';
import {
  buildOrderConfirmationEmailData,
  FulfilledOrderData,
  EmailServiceConfig,
} from './email.service';

/**
 * Property 12: Email Content Completeness
 *
 * For any fulfilled order, the order confirmation email data contains the order code,
 * all product names, all prices, the total amount, the payment method, and the
 * download page URL.
 *
 * **Validates: Requirements 6.2**
 */
describe('Property 12: Email Content Completeness', () => {
  /**
   * Arbitrary that generates a valid storefront URL.
   */
  const storefrontUrlArbitrary = fc.oneof(
    fc.constantFrom(
      'https://store.ngopicode.com',
      'https://ngopicode.com',
      'http://localhost:3000',
    ),
    fc.webUrl(),
  );

  /**
   * Arbitrary that generates a valid email service config.
   */
  const emailServiceConfigArbitrary: fc.Arbitrary<EmailServiceConfig> =
    storefrontUrlArbitrary.map((url) => ({ storefrontUrl: url }));

  /**
   * Arbitrary that generates a non-empty order code string.
   */
  const orderCodeArbitrary = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
    { minLength: 4, maxLength: 20 },
  );

  /**
   * Arbitrary that generates a valid product name (non-empty).
   */
  const productNameArbitrary = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.'),
    { minLength: 1, maxLength: 100 },
  );

  /**
   * Arbitrary that generates a positive price in cents (IDR).
   */
  const priceArbitrary = fc.integer({ min: 1000, max: 100_000_000 });

  /**
   * Arbitrary that generates a valid order line item.
   */
  const orderLineArbitrary = fc.record({
    productVariant: fc.record({
      name: productNameArbitrary,
    }),
    unitPriceWithTax: priceArbitrary,
  });

  /**
   * Arbitrary that generates a valid payment method name.
   */
  const paymentMethodArbitrary = fc.constantFrom(
    'BRIVA',
    'QRIS',
    'OVO',
    'DANA',
    'BCAVA',
    'MANDIRIVA',
    'SHOPEEPAY',
  );

  /**
   * Arbitrary that generates a valid customer.
   */
  const customerArbitrary = fc.record({
    firstName: fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
      { minLength: 1, maxLength: 50 },
    ),
    emailAddress: fc.emailAddress(),
  });

  /**
   * Arbitrary that generates a fulfilled order with at least one line item.
   */
  const fulfilledOrderArbitrary: fc.Arbitrary<FulfilledOrderData> = fc
    .record({
      orderCode: orderCodeArbitrary,
      customer: customerArbitrary,
      lines: fc.array(orderLineArbitrary, { minLength: 1, maxLength: 10 }),
      totalWithTax: priceArbitrary,
      paymentMethod: paymentMethodArbitrary,
      paidAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }),
    });

  it('should always include the order code in email data', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);

          // Order code must be present and match the order
          expect(emailData.orderCode).toBe(order.orderCode);
          expect(emailData.orderCode.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should always include all product names from the order', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);

          // Must have same number of items as order lines
          expect(emailData.items.length).toBe(order.lines.length);

          // Each product name must match the corresponding order line
          for (let i = 0; i < order.lines.length; i++) {
            expect(emailData.items[i].productName).toBe(
              order.lines[i].productVariant.name,
            );
            expect(emailData.items[i].productName.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should always include all prices from the order', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);

          // Each price must match the corresponding order line price
          for (let i = 0; i < order.lines.length; i++) {
            expect(emailData.items[i].price).toBe(
              order.lines[i].unitPriceWithTax,
            );
            expect(emailData.items[i].price).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should always include the total amount', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);

          // Total amount must be present and match the order total
          expect(emailData.totalAmount).toBe(order.totalWithTax);
          expect(emailData.totalAmount).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should always include the payment method', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);

          // Payment method must be present and match the order
          expect(emailData.paymentMethod).toBe(order.paymentMethod);
          expect(emailData.paymentMethod.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should always include the download page URL for all items', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);
          const expectedUrl = `${config.storefrontUrl}/downloads/${order.orderCode}`;

          // Each item must have the download page URL
          for (const item of emailData.items) {
            expect(item.downloadUrl).toBe(expectedUrl);
            expect(item.downloadUrl.length).toBeGreaterThan(0);
            expect(item.downloadUrl).toContain('/downloads/');
            expect(item.downloadUrl).toContain(order.orderCode);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should contain all required fields for any fulfilled order (combined property)', () => {
    fc.assert(
      fc.property(
        fulfilledOrderArbitrary,
        emailServiceConfigArbitrary,
        (order, config) => {
          const emailData = buildOrderConfirmationEmailData(order, config);

          // 1. Order code is non-empty and matches
          expect(emailData.orderCode).toBe(order.orderCode);
          expect(emailData.orderCode.length).toBeGreaterThan(0);

          // 2. All product names present
          expect(emailData.items.length).toBe(order.lines.length);
          const emailProductNames = emailData.items.map((i) => i.productName);
          const orderProductNames = order.lines.map((l) => l.productVariant.name);
          expect(emailProductNames).toEqual(orderProductNames);

          // 3. All prices present
          const emailPrices = emailData.items.map((i) => i.price);
          const orderPrices = order.lines.map((l) => l.unitPriceWithTax);
          expect(emailPrices).toEqual(orderPrices);

          // 4. Total amount
          expect(emailData.totalAmount).toBe(order.totalWithTax);

          // 5. Payment method
          expect(emailData.paymentMethod).toBe(order.paymentMethod);

          // 6. Download page URL for all items
          const expectedUrl = `${config.storefrontUrl}/downloads/${order.orderCode}`;
          for (const item of emailData.items) {
            expect(item.downloadUrl).toBe(expectedUrl);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});
