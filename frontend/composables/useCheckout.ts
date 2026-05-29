import { ref } from 'vue'
import { ADD_PAYMENT_TO_ORDER } from '~/graphql/mutations'

export interface PaymentMethod {
  id: string
  code: string
  name: string
  description: string
}

export interface CheckoutFormInput {
  email: string
  firstName: string
  lastName: string
}

export interface CheckoutFormErrors {
  email: string | null
  firstName: string | null
  lastName: string | null
}

export interface PaymentRedirectResult {
  success: boolean
  redirectUrl?: string
  errorMessage?: string
}

// Validation functions (exported for direct use and testing)

export function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) {
    return 'Email is required'
  }
  if (trimmed.length > 254) {
    return 'Email must be at most 254 characters'
  }
  // Basic email format: has @, has domain with TLD
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address'
  }
  return null
}

export function validateName(name: string, fieldLabel: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return `${fieldLabel} is required`
  }
  if (trimmed.length > 100) {
    return `${fieldLabel} must be at most 100 characters`
  }
  return null
}

export function validateCheckoutForm(form: CheckoutFormInput): CheckoutFormErrors {
  return {
    email: validateEmail(form.email),
    firstName: validateName(form.firstName, 'First name'),
    lastName: validateName(form.lastName, 'Last name'),
  }
}

export function isFormValid(errors: CheckoutFormErrors): boolean {
  return errors.email === null && errors.firstName === null && errors.lastName === null
}

export function useCheckout() {
  const availablePaymentMethods = ref<PaymentMethod[]>([])
  const selectedPaymentMethod = ref<string | null>(null)
  const paymentError = ref<string | null>(null)
  const isProcessing = ref(false)
  const lastPaymentMethodCode = ref<string | null>(null)

  async function createPayment(paymentMethodCode: string): Promise<PaymentRedirectResult> {
    const { $apollo } = useNuxtApp()
    isProcessing.value = true
    paymentError.value = null
    lastPaymentMethodCode.value = paymentMethodCode

    try {
      const { data } = await $apollo.defaultClient.mutate({
        mutation: ADD_PAYMENT_TO_ORDER,
        variables: {
          input: {
            method: paymentMethodCode,
            metadata: {},
          },
        },
      })

      const result = data.addPaymentToOrder

      if (result.errorCode) {
        const errorMsg = result.message || 'Payment initiation failed'
        paymentError.value = errorMsg
        return { success: false, errorMessage: errorMsg }
      }

      // Extract redirect URL from payment metadata
      const payment = result.payments?.[result.payments.length - 1]
      const metadata = payment?.metadata
      const redirectUrl = metadata?.redirectUrl || metadata?.payment_url

      if (!redirectUrl) {
        const errorMsg = 'No payment redirect URL received'
        paymentError.value = errorMsg
        return { success: false, errorMessage: errorMsg }
      }

      // Redirect to Tripay payment page within 3 seconds
      setTimeout(() => {
        window.location.href = redirectUrl
      }, 1000)

      return { success: true, redirectUrl }
    } catch (err: any) {
      const errorMsg = err.message || 'Payment initiation failed'
      paymentError.value = errorMsg
      return { success: false, errorMessage: errorMsg }
    } finally {
      isProcessing.value = false
    }
  }

  async function retryPayment(): Promise<PaymentRedirectResult> {
    if (!lastPaymentMethodCode.value) {
      const errorMsg = 'No previous payment method to retry'
      paymentError.value = errorMsg
      return { success: false, errorMessage: errorMsg }
    }
    return createPayment(lastPaymentMethodCode.value)
  }

  return {
    availablePaymentMethods,
    selectedPaymentMethod,
    paymentError,
    isProcessing,
    createPayment,
    retryPayment,
  }
}
