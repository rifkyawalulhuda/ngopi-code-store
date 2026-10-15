import { WhatsappService } from './whatsapp.service';
import { WahaClient } from './waha.client';

describe('WhatsappService', () => {
  const originalEnv = { ...process.env };
  let client: { sendText: jest.Mock; getSessions: jest.Mock; isSessionWorking: jest.Mock };

  beforeEach(() => {
    client = {
      sendText: jest.fn().mockResolvedValue({ success: true, messageId: 'M1' }),
      getSessions: jest.fn().mockResolvedValue([]),
      isSessionWorking: jest.fn().mockResolvedValue(true),
    };
    process.env = { ...originalEnv };
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WAHA_API_KEY = 'key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const make = () => new WhatsappService(client as unknown as WahaClient);

  describe('enablement', () => {
    it('is disabled when WHATSAPP_ENABLED is off', () => {
      process.env.WHATSAPP_ENABLED = 'false';
      expect(make().isEnabled()).toBe(false);
    });

    it('is disabled when the API key is missing, even if the flag is on', () => {
      process.env.WAHA_API_KEY = '';
      expect(make().isEnabled()).toBe(false);
    });

    it('is enabled when the flag is on and a key exists', () => {
      expect(make().isEnabled()).toBe(true);
    });
  });

  describe('dispatch gating', () => {
    it('does not call WAHA when disabled', async () => {
      process.env.WHATSAPP_ENABLED = 'false';
      const outcome = await make().sendOrderConfirmation('081234567890', {
        customerName: 'A',
        orderCode: 'O1',
        items: [],
        totalAmount: 0,
        paymentMethod: 'tripay',
        accessUrl: 'https://x/y',
        accessExpiresInHours: 72,
      });

      expect(outcome).toEqual({ sent: false, reason: 'whatsapp-disabled' });
      expect(client.sendText).not.toHaveBeenCalled();
    });

    it('skips an invalid phone number without calling WAHA', async () => {
      const outcome = await make().sendPaymentReminder('123', {
        customerName: 'A',
        orderCode: 'O1',
        amount: 1000,
      });

      expect(outcome).toEqual({ sent: false, reason: 'invalid-phone' });
      expect(client.sendText).not.toHaveBeenCalled();
    });

    it('skips a missing phone number', async () => {
      const outcome = await make().sendPaymentReminder(null, {
        customerName: 'A',
        orderCode: 'O1',
        amount: 1000,
      });
      expect(outcome.sent).toBe(false);
      expect(client.sendText).not.toHaveBeenCalled();
    });
  });

  describe('sending', () => {
    it('normalises the number to a chat id and sends the rendered message', async () => {
      const outcome = await make().sendOrderConfirmation('081234567890', {
        customerName: 'Budi',
        orderCode: 'ORD-9',
        items: [{ productName: 'Kit', price: 50000 }],
        totalAmount: 50000,
        paymentMethod: 'tripay',
        accessUrl: 'https://store/auth/order-access?token=t',
        accessExpiresInHours: 72,
      });

      expect(outcome.sent).toBe(true);
      const [chatId, text] = client.sendText.mock.calls[0];
      expect(chatId).toBe('6281234567890@c.us');
      expect(text).toContain('ORD-9');
      expect(text).toContain('https://store/auth/order-access?token=t');
    });

    it('reports failure (without throwing) when WAHA rejects the send', async () => {
      client.sendText.mockResolvedValue({ success: false, errorMessage: 'session offline' });

      const outcome = await make().sendPaymentInstructions('081234567890', {
        customerName: 'A',
        orderCode: 'O2',
        channelName: 'BRI VA',
        amount: 1000,
      });

      expect(outcome).toEqual({ sent: false, reason: 'session offline' });
    });
  });

  describe('getDiagnostics', () => {
    it('reports disabled state', async () => {
      process.env.WHATSAPP_ENABLED = 'false';
      const diag = await make().getDiagnostics();
      expect(diag.enabled).toBe(false);
      expect(diag.sessionWorking).toBe(false);
    });

    it('reports the session status when enabled', async () => {
      const diag = await make().getDiagnostics();
      expect(diag).toEqual({ enabled: true, session: 'default', sessionWorking: true });
    });

    it('reports an error when the client throws', async () => {
      client.isSessionWorking.mockRejectedValue(new Error('boom'));
      const diag = await make().getDiagnostics();
      expect(diag.enabled).toBe(true);
      expect(diag.sessionWorking).toBe(false);
      expect(diag.error).toBe('boom');
    });
  });
});
