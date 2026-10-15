import {
  renderOrderConfirmationMessage,
  renderPaymentInstructionsMessage,
  renderPaymentReminderMessage,
  renderReceiptMessage,
  formatIDR,
  formatDateID,
  escapeWhatsapp,
} from './index';

describe('whatsapp templates', () => {
  describe('format helpers', () => {
    it('formats IDR with thousand separators and no decimals', () => {
      expect(formatIDR(50000)).toBe('Rp 50.000');
      expect(formatIDR(1500000)).toBe('Rp 1.500.000');
      expect(formatIDR(0)).toBe('Rp 0');
    });

    it('formats a date in Indonesian', () => {
      const formatted = formatDateID(new Date('2025-06-15T07:30:00Z'));
      expect(formatted).toMatch(/2025/);
      expect(formatted).toMatch(/WIB/);
    });

    it('returns "-" for invalid dates', () => {
      expect(formatDateID(null)).toBe('-');
      expect(formatDateID('nonsense')).toBe('-');
    });

    it('strips WhatsApp markdown characters from user text', () => {
      expect(escapeWhatsapp('*bold* _italic_ ~strike~ `code`')).toBe(
        'bold italic strike code',
      );
    });
  });

  describe('order confirmation', () => {
    const data = {
      customerName: 'Budi',
      orderCode: 'ORD-1',
      items: [
        { productName: 'Starter Kit', price: 50000 },
        { productName: 'UI Pack', price: 25000 },
      ],
      totalAmount: 75000,
      paymentMethod: 'tripay',
      accessUrl: 'https://store.test/auth/order-access?token=abc',
      accessExpiresInHours: 72,
    };

    it('includes the order code, items, total and access link', () => {
      const msg = renderOrderConfirmationMessage(data);
      expect(msg).toContain('ORD-1');
      expect(msg).toContain('Starter Kit');
      expect(msg).toContain('Rp 75.000');
      expect(msg).toContain(data.accessUrl);
      expect(msg).toContain('72 jam');
    });

    it('appends the receipt link only when provided', () => {
      expect(renderOrderConfirmationMessage(data)).not.toContain('Bukti transaksi');
      const withReceipt = renderOrderConfirmationMessage({
        ...data,
        receiptUrl: 'https://store.test/receipt/ORD-1',
      });
      expect(withReceipt).toContain('Bukti transaksi');
      expect(withReceipt).toContain('https://store.test/receipt/ORD-1');
    });

    it('escapes markdown in the customer name and product names', () => {
      const msg = renderOrderConfirmationMessage({
        ...data,
        customerName: '*Budi*',
        items: [{ productName: '_Kit_', price: 1000 }],
      });
      expect(msg).toContain('Halo *Budi*,');
      expect(msg).toContain('Kit');
      expect(msg).not.toContain('_Kit_');
    });
  });

  describe('payment instructions', () => {
    it('includes channel, pay code, amount, expiry and instructions', () => {
      const msg = renderPaymentInstructionsMessage({
        customerName: 'Siti',
        orderCode: 'ORD-2',
        channelName: 'BRI VA',
        payCode: '12345678901',
        amount: 99000,
        expiresAt: new Date('2025-06-16T10:00:00Z'),
        paymentUrl: 'https://pay.test/x',
        instructions: [
          { title: 'Cara Bayar', steps: ['Buka <b>m-Banking</b><br/>Pilih transfer', 'Masukkan nominal'] },
        ],
      });

      expect(msg).toContain('BRI VA');
      expect(msg).toContain('12345678901');
      expect(msg).toContain('Rp 99.000');
      expect(msg).toContain('https://pay.test/x');
      expect(msg).toContain('1. Buka m-Banking Pilih transfer');
      expect(msg).toContain('2. Masukkan nominal');
    });

    it('omits the pay code and instructions when absent', () => {
      const msg = renderPaymentInstructionsMessage({
        customerName: 'A',
        orderCode: 'ORD-3',
        channelName: 'QRIS',
        amount: 1000,
      });
      expect(msg).not.toContain('Nomor Pembayaran');
      expect(msg).toContain('QRIS');
    });
  });

  describe('payment reminder', () => {
    it('mentions the amount and expiry', () => {
      const msg = renderPaymentReminderMessage({
        customerName: 'Andi',
        orderCode: 'ORD-4',
        amount: 120000,
        expiresAt: new Date('2025-06-16T10:00:00Z'),
        paymentUrl: 'https://pay.test/y',
      });
      expect(msg).toContain('ORD-4');
      expect(msg).toContain('Rp 120.000');
      expect(msg).toContain('https://pay.test/y');
      expect(msg).toContain('belum dibayar');
    });
  });

  describe('receipt', () => {
    it('includes the receipt link and paid date', () => {
      const msg = renderReceiptMessage({
        customerName: 'Rina',
        orderCode: 'ORD-5',
        items: [{ productName: 'Ebook', price: 30000 }],
        totalAmount: 30000,
        paymentMethod: 'tripay',
        paidAt: new Date('2025-06-15T10:00:00Z'),
        receiptUrl: 'https://store.test/receipt/ORD-5',
      });
      expect(msg).toContain('ORD-5');
      expect(msg).toContain('Rp 30.000');
      expect(msg).toContain('https://store.test/receipt/ORD-5');
    });
  });
});
