import { renderOrderConfirmationEmail } from './order-confirmation.template';
import { OrderConfirmationEmailData } from '../../../shared/types/email.types';

describe('renderOrderConfirmationEmail', () => {
  const baseData: OrderConfirmationEmailData = {
    customerName: 'Budi Santoso',
    customerEmail: 'budi@example.com',
    orderCode: 'NC-20240115-001',
    items: [
      {
        productName: 'Nuxt 3 Starter Kit',
        price: 150000,
        downloadUrl: 'https://store.ngopicode.com/downloads/NC-20240115-001',
      },
      {
        productName: 'Laravel API Boilerplate',
        price: 200000,
        downloadUrl: 'https://store.ngopicode.com/downloads/NC-20240115-001',
      },
    ],
    totalAmount: 350000,
    paymentMethod: 'QRIS',
    paidAt: new Date('2024-01-15T10:30:00Z'),
  };

  it('should return a valid HTML document', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('should include the order code', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('NC-20240115-001');
  });

  it('should include all product names', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('Nuxt 3 Starter Kit');
    expect(html).toContain('Laravel API Boilerplate');
  });

  it('should include product prices formatted in IDR', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('Rp');
    expect(html).toContain('150');
    expect(html).toContain('200');
  });

  it('should include the total amount formatted in IDR', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('350');
  });

  it('should include the payment method', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('QRIS');
  });

  it('should include the download page URL as a link', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('https://store.ngopicode.com/downloads/NC-20240115-001');
    expect(html).toContain('href="https://store.ngopicode.com/downloads/NC-20240115-001"');
  });

  it('should include the NgopiCode brand name', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('NgopiCode');
  });

  it('should include the customer name in greeting', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('Budi Santoso');
  });

  it('should escape HTML special characters in user-provided data', () => {
    const maliciousData: OrderConfirmationEmailData = {
      ...baseData,
      customerName: '<script>alert("xss")</script>',
      orderCode: 'NC-<img>-001',
      items: [
        {
          productName: 'Product & "Special" <Chars>',
          price: 100000,
          downloadUrl: 'https://store.ngopicode.com/downloads/NC-001',
        },
      ],
    };
    const html = renderOrderConfirmationEmail(maliciousData);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('should use inline CSS for email client compatibility', () => {
    const html = renderOrderConfirmationEmail(baseData);
    // Should not have <style> blocks (inline CSS only)
    expect(html).not.toContain('<style');
    // Should have inline style attributes
    expect(html).toContain('style="');
  });

  it('should include a prominent download button', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('Unduh Produk Anda');
  });

  it('should handle single item orders', () => {
    const singleItemData: OrderConfirmationEmailData = {
      ...baseData,
      items: [baseData.items[0]],
      totalAmount: 150000,
    };
    const html = renderOrderConfirmationEmail(singleItemData);
    expect(html).toContain('Nuxt 3 Starter Kit');
    expect(html).not.toContain('Laravel API Boilerplate');
  });

  it('should be responsive with max-width constraint', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('max-width: 600px');
  });

  it('should include viewport meta tag for mobile rendering', () => {
    const html = renderOrderConfirmationEmail(baseData);
    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });
});
