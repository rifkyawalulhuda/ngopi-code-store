import { ref, readonly } from 'vue'
import type { Ref } from 'vue'
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
 * Handles register, login, logout, email verification, and session state.
 */
export function useAuth() {
  const customer: Ref<ActiveCustomer | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<AuthError> = ref(null)

  /**
   * Register a new customer account.
   * Vendure will send a verification email automatically (via our EmailVerificationPlugin).
   * Returns true if registration was successful.
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

      // Handle errors
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
   * Returns true if login was successful.
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
        // Fetch full customer data after login
        await fetchActiveCustomer()
        return true
      }

      // Handle specific errors
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
      customer.value = null
    } catch {
      // Silent fail on logout
    }
  }

  /**
   * Verify customer email with the token from the verification link.
   * Also passes the stored password if available (needed when requireVerification is true).
   * Returns true if verification was successful.
   */
  async function verifyEmail(token: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      // Retrieve password stored during registration
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
        // Clean up stored password
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
        // Password was already set during registration — verification still succeeded
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
   * Fetch the currently logged-in customer.
   */
  async function fetchActiveCustomer(): Promise<void> {
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_ACTIVE_CUSTOMER,
        fetchPolicy: 'network-only',
      })
      customer.value = data?.activeCustomer || null
    } catch {
      customer.value = null
    }
  }

  return {
    customer: readonly(customer),
    loading: readonly(loading),
    error,
    register,
    login,
    logout,
    verifyEmail,
    fetchActiveCustomer,
  }
}
