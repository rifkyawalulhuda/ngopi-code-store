import { GuestAccountService } from './guest-account.service';

describe('GuestAccountService', () => {
  let service: GuestAccountService;
  let userRepo: { save: jest.Mock };
  let customerRepo: { save: jest.Mock; update: jest.Mock };
  let nativeAuthRepo: { findOne: jest.Mock; save: jest.Mock };
  let connection: any;
  let userService: { createCustomerUser: jest.Mock };
  let customerService: any;
  let authService: { createAuthenticatedSessionForUser: jest.Mock };
  const ctx: any = {};

  beforeEach(() => {
    userRepo = { save: jest.fn(async (e: any) => e) };
    customerRepo = { save: jest.fn(async (e: any) => e), update: jest.fn() };
    nativeAuthRepo = {
      findOne: jest.fn().mockResolvedValue({ verificationToken: 'abc' }),
      save: jest.fn(async (e: any) => e),
    };

    connection = {
      getRepository: jest.fn((_ctx: any, entity: any) => {
        if (entity.name === 'User') return userRepo;
        if (entity.name === 'Customer') return customerRepo;
        return nativeAuthRepo;
      }),
    };

    userService = {
      createCustomerUser: jest.fn().mockResolvedValue({ id: 99, verified: false }),
    };
    customerService = {};
    authService = {
      createAuthenticatedSessionForUser: jest
        .fn()
        .mockResolvedValue({ token: 'session-token', expires: new Date() }),
    };

    service = new GuestAccountService(
      connection,
      userService as any,
      customerService,
      authService as any,
    );
  });

  describe('ensureHiddenUser', () => {
    it('returns the existing user without creating one', async () => {
      const existing = { id: 5 };
      const customer: any = { id: 1, emailAddress: 'a@b.com', user: existing };

      const result = await service.ensureHiddenUser(ctx, customer);

      expect(result).toBe(existing);
      expect(userService.createCustomerUser).not.toHaveBeenCalled();
    });

    it('creates a verified user with an unknown random password', async () => {
      const customer: any = { id: 1, emailAddress: 'guest@example.com', user: null };

      const user = await service.ensureHiddenUser(ctx, customer);

      expect(userService.createCustomerUser).toHaveBeenCalledWith(
        ctx,
        'guest@example.com',
        expect.stringMatching(/^[0-9a-f]{64}$/),
      );
      expect(user.verified).toBe(true);
      expect(userRepo.save).toHaveBeenCalled();
      expect(customer.user).toBe(user);
      expect(customerRepo.save).toHaveBeenCalledWith(customer);
    });

    it('clears the verification token so no verification link leaks', async () => {
      const customer: any = { id: 1, emailAddress: 'guest@example.com', user: null };

      await service.ensureHiddenUser(ctx, customer);

      expect(nativeAuthRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ verificationToken: null }),
      );
    });

    it('throws when user creation returns an error result', async () => {
      userService.createCustomerUser.mockResolvedValue({
        errorCode: 'SOME_ERROR',
        message: 'boom',
        __typename: 'SomeError',
      });
      const customer: any = { id: 1, emailAddress: 'guest@example.com', user: null };

      await expect(service.ensureHiddenUser(ctx, customer)).rejects.toThrow(/hidden guest user/i);
    });
  });

  describe('createSessionForCustomer', () => {
    it('mints a session for the hidden user', async () => {
      const customer: any = { id: 1, emailAddress: 'guest@example.com', user: null };

      const session = await service.createSessionForCustomer(ctx, customer);

      expect(session?.token).toBe('session-token');
      expect(authService.createAuthenticatedSessionForUser).toHaveBeenCalled();
    });

    it('returns null when the session cannot be created', async () => {
      authService.createAuthenticatedSessionForUser.mockResolvedValue({
        errorCode: 'NOT_VERIFIED_ERROR',
        message: 'not verified',
        __typename: 'NotVerifiedError',
      });
      const customer: any = { id: 1, emailAddress: 'guest@example.com', user: { id: 2 } };

      expect(await service.createSessionForCustomer(ctx, customer)).toBeNull();
    });
  });

  describe('markAsClaimed', () => {
    it('flips isGuest to false and persists the customer', async () => {
      const customer: any = { id: 42, customFields: { isGuest: true } };

      await service.markAsClaimed(ctx, customer);

      expect(customer.customFields.isGuest).toBe(false);
      expect(customerRepo.save).toHaveBeenCalledWith(customer);
    });
  });
});
