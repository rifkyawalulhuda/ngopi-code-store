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
  customerName: string | null
  customerPhone: string | null
  paymentMethod: string | null
  paymentState: string | null
  isRepeatable: boolean
}

export interface PaymentMeta {
  paymentUrl: string
  payCode: string
  paymentName: string
  reference: string
  channelCode: string
  amount: number
  expiredTime: number
  instructions: Array<{ title: string; steps: string[] }>
}

/**
 * Determines the payment status from URL query params and order state.
 */
export function determinePaymentStatus(
  queryStatus: string | undefined | null,
  orderState: string | undefined | null
): PaymentStatus {
  if (queryStatus) {
    const normalized = queryStatus.toUpperCase()
    if (normalized === 'PAID' || normalized === 'SUCCESS') return 'success'
    if (normalized === 'EXPIRED') return 'expired'
    if (normalized === 'FAILED' || normalized === 'ERROR') return 'failed'
    if (normalized === 'UNPAID' || normalized === 'PENDING') return 'pending'
  }

  if (orderState) {
    const normalizedState = orderState.toLowerCase()
    if (normalizedState === 'fulfilled' || normalizedState === 'paymentsettled') return 'success'
    if (normalizedState === 'arranging payment' || normalizedState === 'arrangingpayment') return 'pending'
  }

  return 'unknown'
}

/**
 * Extracts payment metadata from Vendure payment object.
 * Handles both string (JSON) and object formats.
 */
function extractPaymentMeta(payment: any): PaymentMeta | null {
  if (!payment?.metadata) return null

  let meta = payment.metadata
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta) } catch { return null }
  }

  // Vendure stores public metadata under `public` key
  const pub = meta?.public || meta
  if (!pub) return null

  return {
    paymentUrl: pub.paymentUrl || pub.payment_url || '',
    payCode: pub.payCode || pub.pay_code || '',
    paymentName: pub.paymentName || pub.payment_name || '',
    reference: pub.reference || '',
    channelCode: pub.channelCode || '',
    amount: pub.amount || 0,
    expiredTime: pub.expiredTime || pub.expired_time || 0,
    instructions: pub.instructions || [],
  }
}

export function useOrderConfirmation() {
  const order = ref<OrderConfirmation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const paymentStatus = ref<PaymentStatus>('unknown')
  const paymentMeta = ref<PaymentMeta | null>(null)

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
        error.value = 'Pesanan tidak ditemukan. Periksa kode pesanan Anda.'
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
        customerName: orderData.customer
          ? `${orderData.customer.firstName || ''} ${orderData.customer.lastName || ''}`.trim()
          : null,
        customerPhone: orderData.customer?.customFields?.whatsappNumber || null,
        paymentMethod: orderData.payments?.[0]?.method || null,
        paymentState: orderData.payments?.[0]?.state || null,
        isRepeatable: orderData.lines.some((line: any) =>
          line.productVariant?.product?.facetValues?.some((fv: any) => fv.code === 'repeatable')
        ),
      }

      // Extract payment metadata (VA number, instructions, etc.)
      const latestPayment = orderData.payments?.[orderData.payments.length - 1]
      paymentMeta.value = extractPaymentMeta(latestPayment)

      paymentStatus.value = determinePaymentStatus(queryStatus, orderData.state)
    } catch (err: any) {
      error.value = err.message || 'Gagal memuat detail pesanan'
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
    paymentMeta,
    isSuccess,
    isFailed,
    isPending,
    fetchOrderByCode,
  }
}
