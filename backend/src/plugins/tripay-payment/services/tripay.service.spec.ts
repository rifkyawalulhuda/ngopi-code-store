import * as crypto from 'crypto';
import {
  TripayService,
  TripayApiError,
  InvalidPaymentChannelError,
} from './tripay.service';
import {
  TripayPluginOptions,
  TripayCreateTransactionInput,
} from '@shared/types/tripay.types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TripayService', () => {
  const defaultOptions: TripayPluginOptions = {
    apiKey: 'test-api-key',
    privateKey: 'test-private-key',
    merchantCode: 'T12345',
    sandbox: true,
    callbackUrl: 'https://example.com/webhook',
    returnUrl: 'https://example.com/return',
    allowedChannels: [
      { code: 'BRIVA', name: 'BRI Virtual Account', group: 'bank_transfer', active: true },
      { code: 'QRIS', name: 'QRIS', group: 'qris', active: true },
      { code: 'OVO', name: 'OVO', group: 'ewallet', active: true },
      { code: 'INACTIVE', name: 'Inactive Channel', group: 'bank_transfer', active: false },
    ],
  };

  const defaultInput: TripayCreateTransactionInput = {
    method: 'BRIVA',
    merchant_ref: 'ORD-001',
    amount: 150000,
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    order_items: [
      { name: 'Nuxt Starter Kit', price: 100000, quantity: 1 },
      { name: 'Vue Component Library', price: 50000, quantity: 1 },
    ],
  };

  let service: TripayService;

  beforeEach(() => {
    service = new TripayService(defaultOptions);
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should use sandbox URL when sandbox is true', () => {
      const svc = new TripayService({ ...defaultOptions, sandbox: true });
      expect((svc as any).baseUrl).toBe('https://tripay.co.id/api-sandbox');
    });

    it('should use production URL when sandbox is false', () => {
      const svc = new TripayService({ ...defaultOptions, sandbox: false });
      expect((svc as any).baseUrl).toBe('https://tripay.co.id/api');
    });
  });

  describe('validatePaymentChannel', () => {
    it('should not throw for a valid active channel', () => {
      expect(() => service.validatePaymentChannel('BRIVA')).not.toThrow();
      expect(() => service.validatePaymentChannel('QRIS')).not.toThrow();
      expect(() => service.validatePaymentChannel('OVO')).not.toThrow();
    });

    it('should throw InvalidPaymentChannelError for an unknown channel', () => {
      expect(() => service.validatePaymentChannel('UNKNOWN')).toThrow(
        InvalidPaymentChannelError,
      );
    });

    it('should throw InvalidPaymentChannelError for an inactive channel', () => {
      expect(() => service.validatePaymentChannel('INACTIVE')).toThrow(
        InvalidPaymentChannelError,
      );
    });

    it('should throw with descriptive message including the channel code', () => {
      expect(() => service.validatePaymentChannel('BADCODE')).toThrow(
        /Invalid payment channel code: BADCODE/,
      );
    });
  });

  describe('generateSignature', () => {
    it('should generate correct HMAC SHA256 signature', () => {
      const merchantRef = 'ORD-001';
      const amount = 150000;
      const expected = crypto
        .createHmac('sha256', defaultOptions.privateKey)
        .update(defaultOptions.merchantCode + merchantRef + amount)
        .digest('hex');

      const result = service.generateSignature(merchantRef, amount);
      expect(result).toBe(expected);
    });

    it('should produce different signatures for different amounts', () => {
      const sig1 = service.generateSignature('ORD-001', 100000);
      const sig2 = service.generateSignature('ORD-001', 200000);
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different merchant refs', () => {
      const sig1 = service.generateSignature('ORD-001', 100000);
      const sig2 = service.generateSignature('ORD-002', 100000);
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('createTransaction', () => {
    const successResponse = {
      success: true,
      data: {
        reference: 'T0001000000000000001',
        merchant_ref: 'ORD-001',
        payment_url: 'https://tripay.co.id/checkout/T0001000000000000001',
        amount: 150000,
        status: 'UNPAID',
        expired_time: Math.floor(Date.now() / 1000) + 86400,
      },
    };

    it('should return successful response from Tripay', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      const result = await service.createTransaction(defaultInput);

      expect(result.success).toBe(true);
      expect(result.data.reference).toBe('T0001000000000000001');
      expect(result.data.payment_url).toContain('https://tripay.co.id/checkout/');
    });

    it('should call the sandbox URL when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      await service.createTransaction(defaultInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://tripay.co.id/api-sandbox/transaction/create',
        expect.any(Object),
      );
    });

    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      await service.createTransaction(defaultInput);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBe('Bearer test-api-key');
    });

    it('should include all order line items in the request payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      await service.createTransaction(defaultInput);

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.order_items).toHaveLength(2);
      expect(body.order_items[0]).toEqual({
        name: 'Nuxt Starter Kit',
        price: 100000,
        quantity: 1,
      });
      expect(body.order_items[1]).toEqual({
        name: 'Vue Component Library',
        price: 50000,
        quantity: 1,
      });
    });

    it('should include signature, callback_url, return_url, and expired_time in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      await service.createTransaction(defaultInput);

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.signature).toBeDefined();
      expect(body.callback_url).toBe('https://example.com/webhook');
      expect(body.return_url).toBe('https://example.com/return');
      expect(body.expired_time).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should throw InvalidPaymentChannelError for invalid channel before calling API', async () => {
      const invalidInput = { ...defaultInput, method: 'INVALID' };

      await expect(service.createTransaction(invalidInput)).rejects.toThrow(
        InvalidPaymentChannelError,
      );

      // Should NOT have called fetch at all
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw TripayApiError with TIMEOUT code on timeout', async () => {
      // Simulate AbortError (timeout)
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      try {
        await service.createTransaction(defaultInput);
        fail('Expected TripayApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TripayApiError);
        expect((error as TripayApiError).code).toBe('TIMEOUT');
        expect((error as TripayApiError).message).toContain('timed out');
      }
    });

    it('should throw TripayApiError with API_ERROR code on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          success: false,
          message: 'Invalid amount',
        }),
      });

      try {
        await service.createTransaction(defaultInput);
        fail('Expected TripayApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TripayApiError);
        expect((error as TripayApiError).code).toBe('API_ERROR');
        expect((error as TripayApiError).statusCode).toBe(422);
        expect((error as TripayApiError).message).toBe('Invalid amount');
      }
    });

    it('should throw TripayApiError with API_ERROR when response has success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          success: false,
          message: 'Merchant not found',
        }),
      });

      try {
        await service.createTransaction(defaultInput);
        fail('Expected TripayApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TripayApiError);
        expect((error as TripayApiError).code).toBe('API_ERROR');
        expect((error as TripayApiError).message).toBe('Merchant not found');
      }
    });

    it('should throw TripayApiError with NETWORK_ERROR on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      try {
        await service.createTransaction(defaultInput);
        fail('Expected TripayApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TripayApiError);
        expect((error as TripayApiError).code).toBe('NETWORK_ERROR');
        expect((error as TripayApiError).message).toContain('fetch failed');
      }
    });

    it('should use AbortController signal for timeout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      });

      await service.createTransaction(defaultInput);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.signal).toBeDefined();
      expect(callArgs.signal).toBeInstanceOf(AbortSignal);
    });
  });
});
