import { ref, computed } from 'vue'
import { GET_ORDER_BY_CODE } from '~/graphql/queries'

export type PaymentStatus = 'success' | 'failed' | 'expired' | 'pending' | 'unknown'

export interface OrderLineItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  linePrice: number
}

export interface OrderConfirmation {
  id: string
  code: string
  state: string
  totalQuantity: number
  subTotal: number
  total: number
  lines: OrderLineItem[]
  customerEmail: string | null
  paymentMethod: string | null
  paymentState: string | null
}

/**
 * Determines the payment status from URL query params and order state.
 * Tripay redirects back with query params indicating payment result.
 */
export function determinePaymentStatus(
  queryStatus: string | undefined | null,
  orderState: string | undefined | null
): PaymentStatus {
  // Check query param status first (from Tripay return URL)
  if (queryStatus) {
    const normalized = queryStatus.toUpperCase()
    if (normalized === 'PAID' || normalized === 'SUCCESS') {
      return 'success'
    }
    if (normalized === 'EXPIRED') {
      return 'expired'
    }
    if (normalized === 'FAILED' || normalized === 'ERROR') {
      return 'failed'
    }
    if (normalized === 'UNPAID' || normalized === 'PENDING') {
      return 'pending'
    }
  }

  // Fallback: determine from order state
  if (orderState) {
    const normalizedState = orderState.toLowerCase()
    if (normalizedState === 'fulfilled' || normalizedState === 'paymentsettled') {
      return 'success'
    }
    if (normalizedState === 'arranging payment' || normalizedState === 'arrangingpayment') {
      return 'pending'
    }
  }

  return 'unknown'
}

export function useOrderConfirmation() {
  const order = ref<OrderConfirmation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const paymentStatus = ref<PaymentStatus>('unknown')

  async function fetchOrderByCode(code: string, queryStatus?: string | null): Promise<void> {
    const { $apollo } = useNuxtApp()
    loading.value = true
    error.value = null

    try {
      const { data } = await $apollo.defaultClient.query({
        query: GET_ORDER_BY_CODE,
        variables: { code },
        fetchPolicy: 'network-only',
      })

      if (!data.orderByCode) {
        error.value = 'Order not found. Please check your order code.'
        paymentStatus.value = 'unknown'
        return
      }

      const orderData = data.orderByCode

      order.value = {
        id: orderData.id,
        code: orderData.code,
        state: orderData.state,
        totalQuantity: orderData.totalQuantity,
        subTotal: orderData.subTotal,
        total: orderData.total,
        lines: orderData.lines.map((line: any) => ({
          id: line.id,
          productName: line.productVariant.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          linePrice: line.linePrice,
        })),
        customerEmail: orderData.customer?.emailAddress || null,
        paymentMethod: orderData.payments?.[0]?.method || null,
        paymentState: orderData.payments?.[0]?.state || null,
      }

      paymentStatus.value = determinePaymentStatus(queryStatus, orderData.state)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch order details'
      paymentStatus.value = 'unknown'
    } finally {
      loading.value = false
    }
  }

  const isSuccess = computed(() => paymentStatus.value === 'success')
  const isFailed = computed(() => paymentStatus.value === 'failed' || paymentStatus.value === 'expired')
  const isPending = computed(() => paymentStatus.value === 'pending')

  return {
    order,
    loading,
    error,
    paymentStatus,
    isSuccess,
    isFailed,
    isPending,
    fetchOrderByCode,
  }
}
