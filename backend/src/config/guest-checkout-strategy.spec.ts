import { NgopiGuestCheckoutStrategy } from './guest-checkout-strategy';

describe('NgopiGuestCheckoutStrategy', () => {
  let strategy: NgopiGuestCheckoutStrategy;
  let customerRepo: { findOne: jest.Mock; save: jest.Mock };
  let connection: any;
  let customerService: { createOrUpdate: jest.Mock };
  const originalEnv = { ...process.env };

  const ctx: any = { activeUserId: undefined };
  const order: any = {};

  function build(input?: { existing?: any; created?: any }) {
    customerRepo = {
      findOne: jest.fn().mockResolvedValue(input?.existing ?? null),
      save: jest.fn(async (e: any) => e),
    };
    connection = { getRepository: jest.fn().mockReturnValue(customerRepo) };
    customerService = {
      createOrUpdate: jest.fn().mockResolvedValue(
        input?.created ?? { id: 1, emailAddress: 'x@y.com', customFields: {} },
      ),
    };
    strategy = new NgopiGuestCheckoutStrategy();
    strategy.init({
      get: (token: any) => {
        if (token.name === 'CustomerService') return customerService;
        return connection;
      },
    } as any);
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    build();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects guest checkout when the kill switch is off', async () => {
    process.env.GUEST_CHECKOUT_ENABLED = 'false';
    build();

    const result: any = await strategy.setCustomerForOrder(ctx, order, {
      emailAddress: 'g@example.com',
      firstName: 'G',
      lastName: 'U',
    });

    expect(result.__typename).toBe('GuestCheckoutError');
    expect(customerService.createOrUpdate).not.toHaveBeenCalled();
  });

  it('rejects when a user is already authenticated', async () => {
    const result: any = await strategy.setCustomerForOrder(
      { activeUserId: 5 } as any,
      order,
      { emailAddress: 'g@example.com', firstName: 'G', lastName: 'U' },
    );

    expect(result.__typename).toBe('AlreadyLoggedInError');
  });

  it('rejects a real registered email (forces login / magic link)', async () => {
    build({ existing: { id: 9, emailAddress: 'real@example.com', user: { id: 3 }, customFields: {} } });

    const result: any = await strategy.setCustomerForOrder(ctx, order, {
      emailAddress: 'real@example.com',
      firstName: 'R',
      lastName: 'E',
    });

    expect(result.__typename).toBe('EmailAddressConflictError');
    expect(customerService.createOrUpdate).not.toHaveBeenCalled();
  });

  it('reuses a previous guest account (isGuest = true)', async () => {
    const existingGuest = {
      id: 9,
      emailAddress: 'guest@example.com',
      user: { id: 3 },
      customFields: { isGuest: true },
    };
    build({ existing: existingGuest, created: existingGuest });

    const result: any = await strategy.setCustomerForOrder(ctx, order, {
      emailAddress: 'guest@example.com',
      firstName: 'G',
      lastName: 'U',
    });

    expect(result.__typename).not.toBe('EmailAddressConflictError');
    expect(customerService.createOrUpdate).toHaveBeenCalled();
  });

  it('marks a brand new customer as a guest', async () => {
    const created = { id: 11, emailAddress: 'new@example.com', customFields: {} };
    build({ created });

    const result: any = await strategy.setCustomerForOrder(ctx, order, {
      emailAddress: 'new@example.com',
      firstName: 'N',
      lastName: 'E',
    });

    expect(customerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ customFields: expect.objectContaining({ isGuest: true }) }),
    );
    expect(result.customFields.isGuest).toBe(true);
  });

  it('does not re-mark an existing guest', async () => {
    const existingGuest = {
      id: 9,
      emailAddress: 'guest@example.com',
      user: null,
      customFields: { isGuest: true },
    };
    build({ existing: existingGuest, created: existingGuest });

    await strategy.setCustomerForOrder(ctx, order, {
      emailAddress: 'guest@example.com',
      firstName: 'G',
      lastName: 'U',
    });

    expect(customerRepo.save).not.toHaveBeenCalled();
  });

  it('normalises the email before lookup', async () => {
    build();

    await strategy.setCustomerForOrder(ctx, order, {
      emailAddress: '  Mixed@Case.COM ',
      firstName: 'M',
      lastName: 'C',
    });

    expect(customerRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { emailAddress: 'mixed@case.com' } }),
    );
  });
});
