import { describe, it, expect } from 'vitest'
import { determinePaymentStatus } from './useOrderConfirmation'

describe('determinePaymentStatus', () => {
  describe('from query param status', () => {
    it('returns "success" for PAID status', () => {
      expect(determinePaymentStatus('PAID', null)).toBe('success')
    })

    it('returns "success" for SUCCESS status', () => {
      expect(determinePaymentStatus('SUCCESS', null)).toBe('success')
    })

    it('returns "success" for case-insensitive paid', () => {
      expect(determinePaymentStatus('paid', null)).toBe('success')
      expect(determinePaymentStatus('Paid', null)).toBe('success')
    })

    it('returns "expired" for EXPIRED status', () => {
      expect(determinePaymentStatus('EXPIRED', null)).toBe('expired')
    })

    it('returns "expired" for case-insensitive expired', () => {
      expect(determinePaymentStatus('expired', null)).toBe('expired')
    })

    it('returns "failed" for FAILED status', () => {
      expect(determinePaymentStatus('FAILED', null)).toBe('failed')
    })

    it('returns "failed" for ERROR status', () => {
      expect(determinePaymentStatus('ERROR', null)).toBe('failed')
    })

    it('returns "pending" for UNPAID status', () => {
      expect(determinePaymentStatus('UNPAID', null)).toBe('pending')
    })

    it('returns "pending" for PENDING status', () => {
      expect(determinePaymentStatus('PENDING', null)).toBe('pending')
    })
  })

  describe('from order state (fallback)', () => {
    it('returns "success" for Fulfilled order state', () => {
      expect(determinePaymentStatus(null, 'Fulfilled')).toBe('success')
    })

    it('returns "success" for PaymentSettled order state', () => {
      expect(determinePaymentStatus(null, 'PaymentSettled')).toBe('success')
    })

    it('returns "success" for case-insensitive fulfilled', () => {
      expect(determinePaymentStatus(null, 'fulfilled')).toBe('success')
    })

    it('returns "pending" for ArrangingPayment order state', () => {
      expect(determinePaymentStatus(null, 'ArrangingPayment')).toBe('pending')
    })

    it('returns "unknown" for unrecognized order state', () => {
      expect(determinePaymentStatus(null, 'AddingItems')).toBe('unknown')
    })
  })

  describe('priority: query param over order state', () => {
    it('query param PAID takes priority over order state', () => {
      expect(determinePaymentStatus('PAID', 'ArrangingPayment')).toBe('success')
    })

    it('query param FAILED takes priority over Fulfilled state', () => {
      expect(determinePaymentStatus('FAILED', 'Fulfilled')).toBe('failed')
    })

    it('query param EXPIRED takes priority over any state', () => {
      expect(determinePaymentStatus('EXPIRED', 'PaymentSettled')).toBe('expired')
    })
  })

  describe('edge cases', () => {
    it('returns "unknown" when both params are null', () => {
      expect(determinePaymentStatus(null, null)).toBe('unknown')
    })

    it('returns "unknown" when both params are undefined', () => {
      expect(determinePaymentStatus(undefined, undefined)).toBe('unknown')
    })

    it('returns "unknown" for empty string query status with no order state', () => {
      expect(determinePaymentStatus('', null)).toBe('unknown')
    })
  })
})
