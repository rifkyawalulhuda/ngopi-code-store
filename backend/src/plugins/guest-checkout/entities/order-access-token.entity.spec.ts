import { OrderAccessToken } from './order-access-token.entity';

describe('OrderAccessToken', () => {
  const base = () =>
    new OrderAccessToken({
      tokenHash: 'a'.repeat(64),
      orderId: 1 as any,
      customerId: 2 as any,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

  describe('isUsable', () => {
    it('is usable when unconsumed and not expired', () => {
      expect(base().isUsable()).toBe(true);
    });

    it('is not usable once consumed', () => {
      const token = base();
      token.consumedAt = new Date();
      expect(token.isUsable()).toBe(false);
    });

    it('is not usable once expired', () => {
      const token = base();
      token.expiresAt = new Date(Date.now() - 1000);
      expect(token.isUsable()).toBe(false);
    });

    it('treats the exact expiry instant as expired', () => {
      const now = new Date();
      const token = base();
      token.expiresAt = now;
      expect(token.isUsable(now)).toBe(false);
    });
  });
});
