import { createHash } from 'crypto';
import { OrderAccessService } from './order-access.service';
import { OrderAccessToken } from '../entities/order-access-token.entity';

describe('OrderAccessService', () => {
  let service: OrderAccessService;
  let repo: { save: jest.Mock; findOne: jest.Mock };
  let connection: any;
  const ctx: any = {};

  beforeEach(() => {
    repo = { save: jest.fn(), findOne: jest.fn() };
    connection = { getRepository: jest.fn().mockReturnValue(repo) };
    service = new OrderAccessService(connection);
  });

  describe('hashToken', () => {
    it('returns a 64-char hex SHA-256 digest', () => {
      const hash = service.hashToken('some-token');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).toBe(createHash('sha256').update('some-token').digest('hex'));
    });

    it('is deterministic', () => {
      expect(service.hashToken('x')).toBe(service.hashToken('x'));
    });

    it('never stores the raw token', () => {
      const raw = 'super-secret';
      expect(service.hashToken(raw)).not.toContain(raw);
    });
  });

  describe('issue', () => {
    it('persists only the hash, with the configured expiry', async () => {
      repo.save.mockImplementation(async (e: any) => e);

      const raw = await service.issue(ctx, 10 as any, 20 as any, 72);

      expect(typeof raw).toBe('string');
      expect(raw.length).toBeGreaterThan(20);

      const saved: OrderAccessToken = repo.save.mock.calls[0][0];
      expect(saved.tokenHash).toBe(service.hashToken(raw));
      expect(saved.tokenHash).not.toBe(raw);
      expect(saved.orderId).toBe(10);
      expect(saved.customerId).toBe(20);
      expect(saved.consumedAt).toBeNull();

      const hoursUntilExpiry = (saved.expiresAt.getTime() - Date.now()) / 3_600_000;
      expect(hoursUntilExpiry).toBeGreaterThan(71);
      expect(hoursUntilExpiry).toBeLessThanOrEqual(72);
    });

    it('issues a different token each time', async () => {
      repo.save.mockImplementation(async (e: any) => e);
      const a = await service.issue(ctx, 1 as any, 1 as any, 1);
      const b = await service.issue(ctx, 1 as any, 1 as any, 1);
      expect(a).not.toBe(b);
    });
  });

  describe('consume', () => {
    it('returns null for an empty token', async () => {
      expect(await service.consume(ctx, '')).toBeNull();
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('returns null when the token is unknown', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.consume(ctx, 'nope')).toBeNull();
    });

    it('returns null when the token is already consumed', async () => {
      const record = new OrderAccessToken({
        tokenHash: service.hashToken('used'),
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: new Date(),
      });
      repo.findOne.mockResolvedValue(record);
      expect(await service.consume(ctx, 'used')).toBeNull();
    });

    it('marks a valid token consumed and returns the record', async () => {
      const record = new OrderAccessToken({
        tokenHash: service.hashToken('good'),
        orderId: 7 as any,
        customerId: 8 as any,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      });
      repo.findOne.mockResolvedValue(record);
      repo.save.mockImplementation(async (e: any) => e);

      const result = await service.consume(ctx, 'good');

      expect(result).toBe(record);
      expect(result?.consumedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(record);
    });

    it('looks up by hash, never by raw token', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.consume(ctx, 'raw-token');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: service.hashToken('raw-token') },
      });
    });
  });
});
