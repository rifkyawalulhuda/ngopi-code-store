import { isGuestCheckoutEnabled, getOrderAccessLinkTtlHours } from './guest-checkout';

describe('guest-checkout config', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  describe('isGuestCheckoutEnabled', () => {
    it('defaults to enabled when unset', () => {
      delete process.env.GUEST_CHECKOUT_ENABLED;
      expect(isGuestCheckoutEnabled()).toBe(true);
    });

    it('defaults to enabled when empty', () => {
      process.env.GUEST_CHECKOUT_ENABLED = '';
      expect(isGuestCheckoutEnabled()).toBe(true);
    });

    it.each(['true', '1', 'TRUE', ' true ', 'True'])('is enabled for "%s"', (value) => {
      process.env.GUEST_CHECKOUT_ENABLED = value;
      expect(isGuestCheckoutEnabled()).toBe(true);
    });

    it.each(['false', '0', 'no', 'off', 'FALSE', ' false ', 'Off'])(
      'is disabled for "%s"',
      (value) => {
        process.env.GUEST_CHECKOUT_ENABLED = value;
        expect(isGuestCheckoutEnabled()).toBe(false);
      },
    );

    it('tolerates a trailing space (shell/Docker -e quirk)', () => {
      process.env.GUEST_CHECKOUT_ENABLED = 'false ';
      expect(isGuestCheckoutEnabled()).toBe(false);
    });
  });

  describe('getOrderAccessLinkTtlHours', () => {
    it('defaults to 72 hours to match the download window', () => {
      delete process.env.GUEST_LINK_TTL_HOURS;
      expect(getOrderAccessLinkTtlHours()).toBe(72);
    });

    it('parses a valid override', () => {
      process.env.GUEST_LINK_TTL_HOURS = '48';
      expect(getOrderAccessLinkTtlHours()).toBe(48);
    });

    it.each(['0', '-5', 'abc', ''])('falls back to the default for invalid "%s"', (value) => {
      process.env.GUEST_LINK_TTL_HOURS = value;
      expect(getOrderAccessLinkTtlHours()).toBe(72);
    });
  });
});
