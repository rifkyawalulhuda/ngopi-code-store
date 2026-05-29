import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateEmail,
  validateName,
  validateCheckoutForm,
  isFormValid,
} from './useCheckout'

// Mock Apollo client
const mockMutate = vi.fn()

// Mock useNuxtApp as a global (Nuxt auto-import)
vi.stubGlobal('useNuxtApp', () => ({
  $apollo: {
    defaultClient: {
      mutate: mockMutate,
    },
  },
}))

import { useCheckout } from './useCheckout'

describe('useCheckout - Validation', () => {
  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required')
    })

    it('returns error for whitespace-only email', () => {
      expect(validateEmail('   ')).toBe('Email is required')
    })

    it('returns error for email exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(246) + '@test.com' // 255 chars
      expect(validateEmail(longEmail)).toBe('Email must be at most 254 characters')
    })

    it('returns error for invalid email format - no @', () => {
      expect(validateEmail('invalidemail')).toBe('Please enter a valid email address')
    })

    it('returns error for invalid email format - no domain', () => {
      expect(validateEmail('user@')).toBe('Please enter a valid email address')
    })

    it('returns error for invalid email format - no TLD', () => {
      expect(validateEmail('user@domain')).toBe('Please enter a valid email address')
    })

    it('returns null for valid email', () => {
      expect(validateEmail('user@example.com')).toBeNull()
    })

    it('returns null for valid email with subdomain', () => {
      expect(validateEmail('user@sub.example.com')).toBeNull()
    })

    it('returns null for email at exactly 254 characters', () => {
      const validEmail = 'a'.repeat(240) + '@example.co' // 251 chars
      expect(validateEmail(validEmail)).toBeNull()
    })
  })

  describe('validateName', () => {
    it('returns error for empty name', () => {
      expect(validateName('', 'First name')).toBe('First name is required')
    })

    it('returns error for whitespace-only name', () => {
      expect(validateName('   ', 'First name')).toBe('First name is required')
    })

    it('returns error for name exceeding 100 characters', () => {
      const longName = 'a'.repeat(101)
      expect(validateName(longName, 'First name')).toBe('First name must be at most 100 characters')
    })

    it('returns null for valid name', () => {
      expect(validateName('John', 'First name')).toBeNull()
    })

    it('returns null for name at exactly 100 characters', () => {
      const name = 'a'.repeat(100)
      expect(validateName(name, 'First name')).toBeNull()
    })

    it('uses the provided field label in error messages', () => {
      expect(validateName('', 'Last name')).toBe('Last name is required')
    })
  })

  describe('validateCheckoutForm', () => {
    it('returns all errors for empty form', () => {
      const errors = validateCheckoutForm({
        email: '',
        firstName: '',
        lastName: '',
      })
      expect(errors.email).toBe('Email is required')
      expect(errors.firstName).toBe('First name is required')
      expect(errors.lastName).toBe('Last name is required')
    })

    it('returns no errors for valid form', () => {
      const errors = validateCheckoutForm({
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      })
      expect(errors.email).toBeNull()
      expect(errors.firstName).toBeNull()
      expect(errors.lastName).toBeNull()
    })

    it('returns partial errors for partially valid form', () => {
      const errors = validateCheckoutForm({
        email: 'user@example.com',
        firstName: '',
        lastName: 'Doe',
      })
      expect(errors.email).toBeNull()
      expect(errors.firstName).toBe('First name is required')
      expect(errors.lastName).toBeNull()
    })
  })

  describe('isFormValid', () => {
    it('returns true when all errors are null', () => {
      expect(isFormValid({ email: null, firstName: null, lastName: null })).toBe(true)
    })

    it('returns false when any error is present', () => {
      expect(isFormValid({ email: 'Error', firstName: null, lastName: null })).toBe(false)
      expect(isFormValid({ email: null, firstName: 'Error', lastName: null })).toBe(false)
      expect(isFormValid({ email: null, firstName: null, lastName: 'Error' })).toBe(false)
    })
  })
})

describe('useCheckout - Payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    window.location.href = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have no error and not processing initially', () => {
      const { paymentError, isProcessing } = useCheckout()

      expect(paymentError.value).toBeNull()
      expect(isProcessing.value).toBe(false)
    })
  })

  describe('createPayment', () => {
    it('should call addPaymentToOrder mutation with correct variables', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'QRIS',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX123' },
              },
            ],
          },
        },
      })

      const { createPayment } = useCheckout()
      await createPayment('QRIS')

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          input: {
            method: 'QRIS',
            metadata: {},
          },
        },
      })
    })

    it('should return success with redirect URL when payment is created', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'BRIVA',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX456' },
              },
            ],
          },
        },
      })

      const { createPayment } = useCheckout()
      const result = await createPayment('BRIVA')

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe('https://tripay.co.id/checkout/TX456')
    })

    it('should redirect to Tripay payment page within 3 seconds on success', async () => {
      // Replace window.location with a writable mock
      const originalLocation = window.location
      // @ts-ignore - delete for test purposes
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as any

      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'QRIS',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX789' },
              },
            ],
          },
        },
      })

      const { createPayment } = useCheckout()
      await createPayment('QRIS')

      // Before timeout, redirect should not have happened
      expect(window.location.href).toBe('')

      // After 1 second (within 3 seconds requirement), redirect should happen
      vi.advanceTimersByTime(1000)
      expect(window.location.href).toBe('https://tripay.co.id/checkout/TX789')

      // Restore
      window.location = originalLocation
    })

    it('should handle payment_url metadata field as alternative', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'QRIS',
                state: 'Created',
                metadata: { payment_url: 'https://tripay.co.id/checkout/ALT123' },
              },
            ],
          },
        },
      })

      const { createPayment } = useCheckout()
      const result = await createPayment('QRIS')

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe('https://tripay.co.id/checkout/ALT123')
    })

    it('should return error when backend returns ErrorResult', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            errorCode: 'ORDER_PAYMENT_STATE_ERROR',
            message: 'Order is not ready for payment',
          },
        },
      })

      const { createPayment, paymentError } = useCheckout()
      const result = await createPayment('QRIS')

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Order is not ready for payment')
      expect(paymentError.value).toBe('Order is not ready for payment')
    })

    it('should return error when no redirect URL in payment metadata', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'QRIS',
                state: 'Created',
                metadata: {},
              },
            ],
          },
        },
      })

      const { createPayment, paymentError } = useCheckout()
      const result = await createPayment('QRIS')

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('No payment redirect URL received')
      expect(paymentError.value).toBe('No payment redirect URL received')
    })

    it('should return error on network failure', async () => {
      mockMutate.mockRejectedValue(new Error('Network error'))

      const { createPayment, paymentError } = useCheckout()
      const result = await createPayment('QRIS')

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Network error')
      expect(paymentError.value).toBe('Network error')
    })

    it('should set isProcessing to true during payment and false after', async () => {
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockMutate.mockReturnValue(pendingPromise)

      const { createPayment, isProcessing } = useCheckout()

      expect(isProcessing.value).toBe(false)

      const paymentPromise = createPayment('QRIS')

      // isProcessing should be true while waiting
      expect(isProcessing.value).toBe(true)

      resolvePromise!({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'QRIS',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX123' },
              },
            ],
          },
        },
      })

      await paymentPromise

      expect(isProcessing.value).toBe(false)
    })

    it('should set isProcessing to false after error', async () => {
      mockMutate.mockRejectedValue(new Error('fail'))

      const { createPayment, isProcessing } = useCheckout()
      await createPayment('QRIS')

      expect(isProcessing.value).toBe(false)
    })

    it('should clear previous error on new payment attempt', async () => {
      // First call fails
      mockMutate.mockRejectedValueOnce(new Error('First error'))

      const { createPayment, paymentError } = useCheckout()
      await createPayment('QRIS')
      expect(paymentError.value).toBe('First error')

      // Second call succeeds
      mockMutate.mockResolvedValueOnce({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'BRIVA',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX999' },
              },
            ],
          },
        },
      })

      await createPayment('BRIVA')
      expect(paymentError.value).toBeNull()
    })
  })

  describe('retryPayment', () => {
    it('should retry with the last used payment method', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'QRIS',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX123' },
              },
            ],
          },
        },
      })

      const { createPayment, retryPayment } = useCheckout()

      // First attempt
      await createPayment('QRIS')
      vi.clearAllMocks()

      // Retry
      mockMutate.mockResolvedValue({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-2',
                method: 'QRIS',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/TX456' },
              },
            ],
          },
        },
      })

      const result = await retryPayment()

      expect(result.success).toBe(true)
      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          input: {
            method: 'QRIS',
            metadata: {},
          },
        },
      })
    })

    it('should return error when no previous payment method exists', async () => {
      const { retryPayment, paymentError } = useCheckout()
      const result = await retryPayment()

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('No previous payment method to retry')
      expect(paymentError.value).toBe('No previous payment method to retry')
    })

    it('should retry after a failed payment attempt', async () => {
      // First attempt fails
      mockMutate.mockRejectedValueOnce(new Error('Timeout'))

      const { createPayment, retryPayment, paymentError } = useCheckout()
      await createPayment('BRIVA')
      expect(paymentError.value).toBe('Timeout')

      // Retry succeeds
      mockMutate.mockResolvedValueOnce({
        data: {
          addPaymentToOrder: {
            id: 'order-1',
            state: 'ArrangingPayment',
            payments: [
              {
                id: 'payment-1',
                method: 'BRIVA',
                state: 'Created',
                metadata: { redirectUrl: 'https://tripay.co.id/checkout/RETRY1' },
              },
            ],
          },
        },
      })

      const result = await retryPayment()

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe('https://tripay.co.id/checkout/RETRY1')
      expect(paymentError.value).toBeNull()
    })
  })
})
