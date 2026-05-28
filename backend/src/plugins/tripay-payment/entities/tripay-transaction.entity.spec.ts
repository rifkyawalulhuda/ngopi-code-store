import { TripayTransaction } from './tripay-transaction.entity';

describe('TripayTransaction Entity', () => {
  it('should create an instance with default values', () => {
    const transaction = new TripayTransaction();

    expect(transaction).toBeInstanceOf(TripayTransaction);
  });

  it('should create an instance with provided input via constructor', () => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const transaction = new TripayTransaction({
      orderId: 1,
      merchantRef: 'ORD-20240101-001',
      tripayReference: 'T1234567890',
      paymentMethod: 'BRIVA',
      amount: 150000,
      feeMerchant: 2500,
      feeCustomer: 0,
      status: 'UNPAID',
      paymentUrl: 'https://tripay.co.id/checkout/T1234567890',
      expiredAt: expiry,
      paidAt: null,
    });

    expect(transaction.orderId).toBe(1);
    expect(transaction.merchantRef).toBe('ORD-20240101-001');
    expect(transaction.tripayReference).toBe('T1234567890');
    expect(transaction.paymentMethod).toBe('BRIVA');
    expect(transaction.amount).toBe(150000);
    expect(transaction.feeMerchant).toBe(2500);
    expect(transaction.feeCustomer).toBe(0);
    expect(transaction.status).toBe('UNPAID');
    expect(transaction.paymentUrl).toBe('https://tripay.co.id/checkout/T1234567890');
    expect(transaction.expiredAt).toEqual(expiry);
    expect(transaction.paidAt).toBeNull();
  });

  it('should allow nullable fields to be undefined', () => {
    const transaction = new TripayTransaction({
      orderId: 2,
      merchantRef: 'ORD-20240101-002',
      paymentMethod: 'QRIS',
      amount: 50000,
      status: 'UNPAID',
    });

    expect(transaction.orderId).toBe(2);
    expect(transaction.merchantRef).toBe('ORD-20240101-002');
    expect(transaction.tripayReference).toBeUndefined();
    expect(transaction.paymentUrl).toBeUndefined();
    expect(transaction.expiredAt).toBeUndefined();
    expect(transaction.paidAt).toBeUndefined();
  });

  it('should support all valid status values', () => {
    const statuses = ['UNPAID', 'PAID', 'EXPIRED', 'FAILED'];

    for (const status of statuses) {
      const transaction = new TripayTransaction({
        orderId: 1,
        merchantRef: `REF-${status}`,
        paymentMethod: 'BRIVA',
        amount: 100000,
        status,
      });

      expect(transaction.status).toBe(status);
    }
  });

  it('should support PAID status with paidAt timestamp', () => {
    const paidAt = new Date('2024-06-15T10:30:00Z');

    const transaction = new TripayTransaction({
      orderId: 3,
      merchantRef: 'ORD-20240615-001',
      tripayReference: 'T9876543210',
      paymentMethod: 'OVO',
      amount: 75000,
      feeMerchant: 1500,
      feeCustomer: 500,
      status: 'PAID',
      paidAt,
    });

    expect(transaction.status).toBe('PAID');
    expect(transaction.paidAt).toEqual(paidAt);
  });
});
