import {
  isWhatsappEnabled,
  isWhatsappReminderEnabled,
  getWahaApiKey,
  getWahaBaseUrl,
  getWahaSession,
  getPaymentReminderIntervalMinutes,
  getPaymentReminderLeadMinutes,
  getStorefrontUrl,
} from './whatsapp';

describe('whatsapp config', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.WHATSAPP_ENABLED;
    delete process.env.WHATSAPP_REMINDER_ENABLED;
    delete process.env.WAHA_API_KEY;
    delete process.env.WAHA_BASE_URL;
    delete process.env.WAHA_SESSION;
    delete process.env.WHATSAPP_REMINDER_INTERVAL_MINUTES;
    delete process.env.WHATSAPP_REMINDER_LEAD_MINUTES;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  describe('isWhatsappEnabled', () => {
    it('is disabled by default', () => {
      expect(isWhatsappEnabled()).toBe(false);
    });

    it('is disabled when the flag is on but no API key exists', () => {
      process.env.WHATSAPP_ENABLED = 'true';
      expect(isWhatsappEnabled()).toBe(false);
    });

    it('is disabled when a key exists but the flag is off', () => {
      process.env.WAHA_API_KEY = 'k';
      process.env.WHATSAPP_ENABLED = 'false';
      expect(isWhatsappEnabled()).toBe(false);
    });

    it('is enabled when both are present', () => {
      process.env.WAHA_API_KEY = 'k';
      process.env.WHATSAPP_ENABLED = 'true';
      expect(isWhatsappEnabled()).toBe(true);
    });

    it.each(['true', '1', 'yes', 'on', 'TRUE', ' true '])(
      'accepts the truthy spelling "%s"',
      (value) => {
        process.env.WAHA_API_KEY = 'k';
        process.env.WHATSAPP_ENABLED = value;
        expect(isWhatsappEnabled()).toBe(true);
      },
    );

    it('tolerates whitespace around the API key (shell/Docker -e quirk)', () => {
      process.env.WHATSAPP_ENABLED = 'true ';
      process.env.WAHA_API_KEY = ' secret-key ';
      expect(isWhatsappEnabled()).toBe(true);
      expect(getWahaApiKey()).toBe('secret-key');
    });
  });

  describe('isWhatsappReminderEnabled', () => {
    it('defaults to enabled', () => {
      expect(isWhatsappReminderEnabled()).toBe(true);
    });

    it.each(['false', '0', 'no', 'off', 'FALSE', 'false '])(
      'is disabled for "%s"',
      (value) => {
        process.env.WHATSAPP_REMINDER_ENABLED = value;
        expect(isWhatsappReminderEnabled()).toBe(false);
      },
    );
  });

  describe('accessors', () => {
    it('defaults the WAHA base URL', () => {
      expect(getWahaBaseUrl()).toBe('https://waha.ngopicode.com');
    });

    it('strips trailing slashes from the base URL', () => {
      process.env.WAHA_BASE_URL = 'https://waha.test///';
      expect(getWahaBaseUrl()).toBe('https://waha.test');
    });

    it('defaults the session name', () => {
      expect(getWahaSession()).toBe('default');
      process.env.WAHA_SESSION = '  ';
      expect(getWahaSession()).toBe('default');
      process.env.WAHA_SESSION = ' sales ';
      expect(getWahaSession()).toBe('sales');
    });

    it('parses numeric settings and falls back on invalid input', () => {
      process.env.WHATSAPP_REMINDER_INTERVAL_MINUTES = '30';
      process.env.WHATSAPP_REMINDER_LEAD_MINUTES = '120';
      expect(getPaymentReminderIntervalMinutes()).toBe(30);
      expect(getPaymentReminderLeadMinutes()).toBe(120);

      process.env.WHATSAPP_REMINDER_INTERVAL_MINUTES = 'abc';
      process.env.WHATSAPP_REMINDER_LEAD_MINUTES = '-5';
      expect(getPaymentReminderIntervalMinutes()).toBe(15);
      expect(getPaymentReminderLeadMinutes()).toBe(60);
    });

    it('strips a trailing slash from the storefront URL', () => {
      process.env.STOREFRONT_URL = 'https://store.test/';
      expect(getStorefrontUrl()).toBe('https://store.test');
    });
  });
});
