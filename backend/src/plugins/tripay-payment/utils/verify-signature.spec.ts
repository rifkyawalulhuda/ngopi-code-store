import * as crypto from 'crypto';
import { verifyTripaySignature } from './verify-signature';

describe('verifyTripaySignature', () => {
  const privateKey = 'test-private-key-12345';

  function computeSignature(payload: string, key: string): string {
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  it('should return true for a valid signature', () => {
    const payload = JSON.stringify({ reference: 'T001', status: 'PAID' });
    const signature = computeSignature(payload, privateKey);

    expect(verifyTripaySignature(payload, signature, privateKey)).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const payload = JSON.stringify({ reference: 'T001', status: 'PAID' });
    const wrongSignature = computeSignature('different-payload', privateKey);

    expect(verifyTripaySignature(payload, wrongSignature, privateKey)).toBe(false);
  });

  it('should return false when signature is computed with a different key', () => {
    const payload = JSON.stringify({ reference: 'T001', status: 'PAID' });
    const signature = computeSignature(payload, 'wrong-key');

    expect(verifyTripaySignature(payload, signature, privateKey)).toBe(false);
  });

  it('should return false for a malformed hex signature (odd length)', () => {
    const payload = JSON.stringify({ reference: 'T001', status: 'PAID' });
    // An odd-length hex string will produce a different buffer length
    const malformedSignature = 'abc';

    expect(verifyTripaySignature(payload, malformedSignature, privateKey)).toBe(false);
  });

  it('should return false for an empty signature', () => {
    const payload = JSON.stringify({ reference: 'T001', status: 'PAID' });

    expect(verifyTripaySignature(payload, '', privateKey)).toBe(false);
  });

  it('should handle complex JSON payloads correctly', () => {
    const payload = JSON.stringify({
      reference: 'T0001234567890',
      merchant_ref: 'ORD-2024-001',
      payment_method: 'BRIVA',
      total_amount: 150000,
      status: 'PAID',
      paid_at: '2024-01-15T10:30:00Z',
    });
    const signature = computeSignature(payload, privateKey);

    expect(verifyTripaySignature(payload, signature, privateKey)).toBe(true);
  });

  it('should be sensitive to payload changes (single character difference)', () => {
    const payload = JSON.stringify({ amount: 100000 });
    const tamperedPayload = JSON.stringify({ amount: 100001 });
    const signature = computeSignature(payload, privateKey);

    expect(verifyTripaySignature(tamperedPayload, signature, privateKey)).toBe(false);
  });
});
