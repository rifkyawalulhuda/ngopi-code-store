import { computed } from 'vue'
import {
  REGISTER_CUSTOMER,
  LOGIN,
  LOGOUT,
  VERIFY_CUSTOMER,
  GET_ACTIVE_CUSTOMER,
} from '~/graphql/mutations/auth'

export interface ActiveCustomer {
  id: string
  firstName: string
  lastName: string
  emailAddress: string
}

export type AuthError = string | null

/**
 * Composable for customer authentication.
 * Uses Nuxt useState so the session is shared across all components/pages
 * (header, account page, auth page) within the same request/app instance.
 */
export function useAuth() {
  // Shared, SSR-safe state across the app
  const customer = useState<ActiveCustomer | null>('auth.customer', () => null)
  // Tracks whether we've attempted to fetch the session at least once
  const initialized = useState<boolean>('auth.initialized', () => false)
  const loading = useState<boolean>('auth.loading', () => false)
  const error = useState<AuthError>('auth.error', () => null)

  const isLoggedIn = computed(() => customer.value !== null)

  /**
   * Register a new customer account.
   * Vendure will send a verification email automatically (via EmailVerificationPlugin).
   */
  async function register(input: {
    firstName: string
    lastName: string
    emailAddress: string
    password: string
  }): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.mutate({
        mutation: REGISTER_CUSTOMER,
        variables: { input },
      })

      const result = data?.registerCustomerAccount
      if (result?.__typename === 'Success') {
        return true
      }

      error.value = result?.message || result?.validationErrorMessage || 'Registrasi gagal'
      return false
    } catch (err: any) {
      error.value = err.message || 'Terjadi kesalahan saat registrasi'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Login with email and password.
   */
  async function login(email: string, password: string, rememberMe = false): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.mutate({
        mutation: LOGIN,
        variables: { email, password, rememberMe },
      })

      const result = data?.login
      if (result?.__typename === 'CurrentUser') {
        await fetchActiveCustomer()
        return true
      }

      if (result?.__typename === 'NotVerifiedError') {
        error.value = 'Email belum diverifikasi. Silakan cek inbox email Anda.'
      } else if (result?.__typename === 'InvalidCredentialsError') {
        error.value = 'Email atau password salah.'
      } else {
        error.value = result?.message || 'Login gagal'
      }
      return false
    } catch (err: any) {
      error.value = err.message || 'Terjadi kesalahan saat login'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout the current customer.
   */
  async function logout(): Promise<void> {
    try {
      const { $apollo } = useNuxtApp()
      await $apollo.defaultClient.mutate({ mutation: LOGOUT })
    } catch {
      // Silent fail on logout
    } finally {
      customer.value = null
    }
  }

  /**
   * Verify customer email with the token from the verification link.
   * Replays the password stored during registration (needed when requireVerification is true).
   */
  async function verifyEmail(token: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      let password: string | null = null
      if (import.meta.client) {
        password = sessionStorage.getItem('_reg_pw')
      }

      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.mutate({
        mutation: VERIFY_CUSTOMER,
        variables: { token, password },
      })

      const result = data?.verifyCustomerAccount
      if (result?.__typename === 'CurrentUser') {
        if (import.meta.client) {
          sessionStorage.removeItem('_reg_pw')
        }
        return true
      }

      if (result?.__typename === 'VerificationTokenExpiredError') {
        error.value = 'Link verifikasi sudah kedaluwarsa. Silakan daftar ulang.'
      } else if (result?.__typename === 'VerificationTokenInvalidError') {
        error.value = 'Link verifikasi tidak valid.'
      } else if (result?.__typename === 'PasswordAlreadySetError') {
        return true
      } else {
        error.value = result?.message || 'Verifikasi gagal'
      }
      return false
    } catch (err: any) {
      error.value = err.message || 'Terjadi kesalahan saat verifikasi'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch the currently logged-in customer and update shared state.
   * Returns the customer (or null).
   */
  async function fetchActiveCustomer(): Promise<ActiveCustomer | null> {
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_ACTIVE_CUSTOMER,
        fetchPolicy: 'network-only',
      })
      customer.value = data?.activeCustomer || null
    } catch {
      customer.value = null
    } finally {
      initialized.value = true
    }
    return customer.value
  }

  /**
   * Ensure the session has been checked at least once.
   * Safe to call from multiple places — only hits the API on first call.
   */
  async function ensureSession(): Promise<ActiveCustomer | null> {
    if (initialized.value) return customer.value
    return fetchActiveCustomer()
  }

  return {
    customer,
    isLoggedIn,
    loading,
    error,
    initialized,
    register,
    login,
    logout,
    verifyEmail,
    fetchActiveCustomer,
    ensureSession,
  }
}
