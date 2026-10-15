import { parseMeta, scanForPaymentReminders } from './whatsapp-notifier';
import { WhatsappService } from './services/whatsapp.service';

describe('whatsapp-notifier', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WHATSAPP_REMINDER_LEAD_MINUTES = '60';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('parseMeta', () => {
    it('reads the public block from an object', () => {
      expect(parseMeta({ public: { payCode: '123' } })).toEqual({ payCode: '123' });
    });

    it('parses a JSON string', () => {
      expect(parseMeta('{"public":{"payCode":"999"}}')).toEqual({ payCode: '999' });
    });

    it('falls back to the root object when there is no public block', () => {
      expect(parseMeta({ payCode: '7' })).toEqual({ payCode: '7' });
    });

    it('returns null for empty or malformed input', () => {
      expect(parseMeta(null)).toBeNull();
      expect(parseMeta(undefined)).toBeNull();
      expect(parseMeta('not json')).toBeNull();
      expect(parseMeta('')).toBeNull();
    });
  });

  describe('scanForPaymentReminders', () => {
    const ctx: any = {};
    let query: jest.Mock;
    let connection: any;
    let whatsapp: { sendPaymentReminder: jest.Mock };

    const inMinutes = (mins: number) => Math.floor(Date.now() / 1000) + mins * 60;

    beforeEach(() => {
      query = jest.fn().mockResolvedValue([]);
      connection = { rawConnection: { query } };
      whatsapp = { sendPaymentReminder: jest.fn().mockResolvedValue({ sent: true }) };
    });

    function row(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        code: 'ORD-1',
        subtotal: 50000,
        phone: '081234567890',
        name: 'Budi',
        metadata: { public: { expiredTime: inMinutes(30), paymentUrl: 'https://pay/x' } },
        ...overrides,
      };
    }

    it('reminds an order inside the lead window and marks it as reminded', async () => {
      query.mockResolvedValueOnce([row()]).mockResolvedValue([]);

      const result = await scanForPaymentReminders(ctx, connection, whatsapp as any);

      expect(result).toEqual({ scanned: 1, reminded: 1 });
      expect(whatsapp.sendPaymentReminder).toHaveBeenCalledWith(
        '081234567890',
        expect.objectContaining({ orderCode: 'ORD-1', amount: 50000 }),
      );
      // Second call is the UPDATE marking the reminder as sent.
      expect(query.mock.calls[1][0]).toMatch(/UPDATE "order"/);
      expect(query.mock.calls[1][1]).toEqual([1]);
    });

    it('skips an order that is not yet inside the lead window', async () => {
      query.mockResolvedValueOnce([row({ metadata: { public: { expiredTime: inMinutes(180) } } })]);

      const result = await scanForPaymentReminders(ctx, connection, whatsapp as any);

      expect(result).toEqual({ scanned: 1, reminded: 0 });
      expect(whatsapp.sendPaymentReminder).not.toHaveBeenCalled();
    });

    it('skips an already-expired order', async () => {
      query.mockResolvedValueOnce([row({ metadata: { public: { expiredTime: inMinutes(-5) } } })]);

      const result = await scanForPaymentReminders(ctx, connection, whatsapp as any);

      expect(result.reminded).toBe(0);
      expect(whatsapp.sendPaymentReminder).not.toHaveBeenCalled();
    });

    it('skips an order with no expiry metadata', async () => {
      query.mockResolvedValueOnce([row({ metadata: null })]);

      const result = await scanForPaymentReminders(ctx, connection, whatsapp as any);

      expect(result.reminded).toBe(0);
      expect(whatsapp.sendPaymentReminder).not.toHaveBeenCalled();
    });

    it('marks the order even when delivery fails, so it is not retried forever', async () => {
      query.mockResolvedValueOnce([row()]).mockResolvedValue([]);
      whatsapp.sendPaymentReminder.mockResolvedValue({ sent: false, reason: 'invalid-phone' });

      const result = await scanForPaymentReminders(ctx, connection, whatsapp as any);

      expect(result.reminded).toBe(0);
      expect(query.mock.calls[1][0]).toMatch(/UPDATE "order"/);
    });

    it('honours a custom lead window', async () => {
      process.env.WHATSAPP_REMINDER_LEAD_MINUTES = '300';
      query.mockResolvedValueOnce([row({ metadata: { public: { expiredTime: inMinutes(180) } } })]);

      const result = await scanForPaymentReminders(ctx, connection, whatsapp as any);

      expect(result.reminded).toBe(1);
    });
  });
});
