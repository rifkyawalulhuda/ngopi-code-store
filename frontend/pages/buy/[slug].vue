<template>
  <div class="checkout-page">
    <TheHeader />

    <main class="checkout-main">
      <div class="checkout-container">
        <!-- Page header -->
        <div class="checkout-header">
          <h1 class="checkout-title">Checkout</h1>
          <p class="checkout-subtitle">Selesaikan pembelian produk digital Anda dengan aman.</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="checkout-loading">
          <div class="spinner" />
          <p>Memuat data...</p>
        </div>

        <!-- Content -->
        <div v-else-if="product" class="checkout-grid">
          <!-- Left: Billing Details -->
          <section class="checkout-billing">
            <div class="section-card">
              <div class="section-header">
                <AppIcon name="user" :size="20" />
                <h2 class="section-title">Detail Pembeli</h2>
              </div>

              <div class="billing-form">
                <div class="form-group">
                  <label class="form-label" for="ck-name">Nama Lengkap</label>
                  <input
                    id="ck-name"
                    type="text"
                    class="form-input"
                    :value="fullName"
                    readonly
                    aria-readonly="true"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="ck-email">Email Address</label>
                  <input
                    id="ck-email"
                    type="email"
                    class="form-input"
                    :value="customer?.emailAddress || ''"
                    readonly
                    aria-readonly="true"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="ck-phone">No. Telepon / WhatsApp</label>
                  <input
                    id="ck-phone"
                    type="tel"
                    class="form-input"
                    :value="customer?.customFields?.whatsappNumber || '—'"
                    readonly
                    aria-readonly="true"
                  />
                </div>

                <p class="billing-note">
                  Data di atas diambil dari akun Anda.
                  <NuxtLink to="/account" class="billing-link">Ubah di Pengaturan</NuxtLink>
                </p>
              </div>
            </div>

            <!-- Payment Method -->
            <div class="section-card">
              <div class="section-header">
                <AppIcon name="lock" :size="20" />
                <h2 class="section-title">Metode Pembayaran</h2>
              </div>

              <div class="payment-channels">
                <!-- Channel groups -->
                <div class="channel-group">
                  <span class="channel-group-label">Virtual Account</span>
                  <div class="channel-options">
                    <label
                      v-for="ch in vaChannels"
                      :key="ch.code"
                      class="channel-option"
                      :class="{ selected: selectedChannel === ch.code }"
                    >
                      <input
                        type="radio"
                        name="payment-channel"
                        :value="ch.code"
                        v-model="selectedChannel"
                        class="channel-radio"
                      />
                      <img :src="`/img/payment/${ch.logo}.svg`" :alt="ch.name" class="channel-logo" />
                      <span class="channel-name">{{ ch.name }}</span>
                    </label>
                  </div>
                </div>

                <div class="channel-group">
                  <span class="channel-group-label">E-Wallet</span>
                  <div class="channel-options">
                    <label
                      v-for="ch in ewalletChannels"
                      :key="ch.code"
                      class="channel-option"
                      :class="{ selected: selectedChannel === ch.code }"
                    >
                      <input
                        type="radio"
                        name="payment-channel"
                        :value="ch.code"
                        v-model="selectedChannel"
                        class="channel-radio"
                      />
                      <img :src="`/img/payment/${ch.logo}.svg`" :alt="ch.name" class="channel-logo" />
                      <span class="channel-name">{{ ch.name }}</span>
                    </label>
                  </div>
                </div>

                <div class="channel-group">
                  <span class="channel-group-label">QRIS</span>
                  <div class="channel-options">
                    <label
                      class="channel-option"
                      :class="{ selected: selectedChannel === 'QRIS' }"
                    >
                      <input
                        type="radio"
                        name="payment-channel"
                        value="QRIS"
                        v-model="selectedChannel"
                        class="channel-radio"
                      />
                      <img src="/img/payment/qris.svg" alt="QRIS" class="channel-logo" />
                      <span class="channel-name">QRIS</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Security badge -->
            <div v-if="paymentError" class="payment-error" role="alert">
              {{ paymentError }}
            </div>

            <div class="security-row">
              <div class="security-badge">
                <AppIcon name="lock" :size="16" />
                <span>Checkout Aman</span>
              </div>
              <div class="security-badge">
                <AppIcon name="check" :size="16" />
                <span>Pengiriman Digital Instan</span>
              </div>
            </div>
          </section>

          <!-- Right: Order Summary -->
          <aside class="checkout-summary">
            <div class="summary-card">
              <h2 class="summary-title">Ringkasan Pesanan</h2>

              <!-- Product item -->
              <div class="summary-item">
                <div class="summary-thumb">
                  <img
                    v-if="product.featuredAsset?.preview"
                    :src="product.featuredAsset.preview"
                    :alt="product.name"
                    loading="lazy"
                  />
                  <AppIcon v-else name="code" :size="24" />
                </div>
                <div class="summary-item-info">
                  <span class="summary-item-name">{{ product.name }}</span>
                  <span class="summary-item-license">{{ product.customFields?.licenseType || 'Personal License' }}</span>
                </div>
                <span class="summary-item-price">{{ formattedPrice }}</span>
              </div>

              <div class="summary-divider" />

              <!-- Price breakdown -->
              <div class="summary-row">
                <span>Subtotal</span>
                <span class="summary-val">{{ formattedPrice }}</span>
              </div>
              <div class="summary-row">
                <span>Pajak</span>
                <span class="summary-val">Rp 0</span>
              </div>

              <div class="summary-divider" />

              <div class="summary-row summary-total">
                <span>Total</span>
                <span class="summary-val">{{ formattedPrice }}</span>
              </div>

              <!-- Phone number required warning for e-wallet -->
              <div v-if="needsPhone" class="phone-warning" role="alert">
                <AppIcon name="user" :size="18" />
                <div class="phone-warning-content">
                  <p class="phone-warning-text">Metode E-Wallet memerlukan nomor telepon.</p>
                  <p class="phone-warning-sub">Tambahkan nomor WhatsApp di Pengaturan Profil terlebih dahulu.</p>
                </div>
                <NuxtLink to="/account?tab=settings" class="phone-warning-link">Atur Profil</NuxtLink>
              </div>

              <!-- CTA Button -->
              <button
                type="button"
                class="btn btn-primary btn-full checkout-cta"
                :disabled="!selectedChannel || processing || needsPhone"
                @click="onProceedPayment"
              >
                <span v-if="processing" class="btn-spinner-sm" />
                <span v-else>Lanjutkan Pembayaran</span>
                <AppIcon v-if="!processing" name="arrowRight" :size="18" />
              </button>

              <!-- Trust signals -->
              <div class="trust-row">
                <div class="trust-item">
                  <AppIcon name="lock" :size="14" />
                  <span>Pembayaran terenkripsi</span>
                </div>
                <div class="trust-item">
                  <AppIcon name="download" :size="14" />
                  <span>Akses instan setelah bayar</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Error state -->
        <div v-else class="checkout-error">
          <AppIcon name="close" :size="28" />
          <h2>Produk tidak ditemukan</h2>
          <p>Produk yang ingin Anda beli tidak tersedia.</p>
          <NuxtLink to="/products" class="btn btn-primary">Kembali ke Katalog</NuxtLink>
        </div>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { GET_PRODUCT_BY_SLUG } from '~/graphql/queries/products'
import { formatPriceIDR } from '~/utils/format'
import gql from 'graphql-tag'

const ADD_ITEM_TO_ORDER = gql`
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        totalWithTax
      }
      ... on OrderModificationError {
        message
      }
      ... on OrderLimitError {
        message
      }
      ... on NegativeQuantityError {
        message
      }
      ... on InsufficientStockError {
        message
      }
    }
  }
`

const TRANSITION_ORDER_STATE = gql`
  mutation TransitionOrderState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        id
        state
      }
      ... on OrderStateTransitionError {
        message
        transitionError
      }
    }
  }
`

const SET_ORDER_CUSTOMER = gql`
  mutation SetOrderCustomer($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
      }
      ... on AlreadyLoggedInError {
        message
      }
      ... on EmailAddressConflictError {
        message
      }
      ... on GuestCheckoutError {
        message
      }
      ... on NoActiveOrderError {
        message
      }
    }
  }
`

const SET_SHIPPING_ADDRESS = gql`
  mutation SetShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
      }
      ... on NoActiveOrderError {
        message
      }
    }
  }
`

const GET_ELIGIBLE_SHIPPING = gql`
  query GetEligibleShipping {
    eligibleShippingMethods {
      id
      name
      price
    }
  }
`

const SET_SHIPPING_METHOD = gql`
  mutation SetShippingMethod($ids: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $ids) {
      ... on Order {
        id
        state
      }
      ... on OrderModificationError {
        message
      }
      ... on IneligibleShippingMethodError {
        message
      }
      ... on NoActiveOrderError {
        message
      }
    }
  }
`

const ADD_PAYMENT_TO_ORDER = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        payments {
          id
          method
          state
          metadata
        }
      }
      ... on OrderPaymentStateError {
        message
      }
      ... on IneligiblePaymentMethodError {
        message
        eligibilityCheckerMessage
      }
      ... on PaymentFailedError {
        message
        paymentErrorMessage
      }
      ... on PaymentDeclinedError {
        message
        paymentErrorMessage
      }
      ... on OrderStateTransitionError {
        message
      }
      ... on NoActiveOrderError {
        message
      }
    }
  }
`

useHead({
  title: 'Checkout - NgopiCode',
})

const route = useRoute()
const slug = route.params.slug as string

const { customer, ensureSession, isLoggedIn } = useAuth()
const loading = ref(true)
const product = ref<any>(null)
const selectedChannel = ref('')
const processing = ref(false)
const paymentError = ref('')

// Tripay payment channels (sandbox-compatible)
const vaChannels = [
  { code: 'BRIVA', name: 'BRI VA', logo: 'bri' },
  { code: 'BNIVA', name: 'BNI VA', logo: 'bni' },
  { code: 'MANDIRIVA', name: 'Mandiri VA', logo: 'mandiri' },
  { code: 'BCAVA', name: 'BCA VA', logo: 'bca' },
]

const ewalletChannels = [
  { code: 'OVO', name: 'OVO', logo: 'ovo' },
  { code: 'DANA', name: 'DANA', logo: 'dana' },
  { code: 'SHOPEEPAY', name: 'ShopeePay', logo: 'shopeepay' },
]

// E-wallet channels require phone number
const ewalletCodes = new Set(['OVO', 'DANA', 'SHOPEEPAY'])
const isEwalletSelected = computed(() => ewalletCodes.has(selectedChannel.value))
const customerPhone = computed(() => customer.value?.customFields?.whatsappNumber || '')
const needsPhone = computed(() => isEwalletSelected.value && !customerPhone.value)

const fullName = computed(() => {
  if (!customer.value) return ''
  return `${customer.value.firstName} ${customer.value.lastName}`.trim()
})

const formattedPrice = computed(() => {
  const price = product.value?.variants?.[0]?.price
  return price != null ? formatPriceIDR(price) : 'Rp 0'
})

onMounted(async () => {
  // Ensure user is logged in
  const activeCustomer = await ensureSession()
  if (!activeCustomer) {
    navigateTo('/auth')
    return
  }

  // Fetch product data
  try {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({
      query: GET_PRODUCT_BY_SLUG,
      variables: { slug },
      fetchPolicy: 'cache-first',
    })

    product.value = data?.product || null
  } catch {
    product.value = null
  } finally {
    loading.value = false
  }
})

/**
 * Process payment: create order in Vendure and initiate Tripay payment.
 * Flow: addItemToOrder → addPaymentToOrder(tripay, channelCode) → redirect to paymentUrl
 */
async function onProceedPayment() {
  if (!selectedChannel.value || !product.value) return

  processing.value = true
  paymentError.value = ''

  try {
    const { $apollo } = useNuxtApp()
    const variantId = product.value.variants?.[0]?.id
    if (!variantId) {
      paymentError.value = 'Produk tidak memiliki varian yang valid.'
      return
    }

    // Step 1: Add item to order (creates a new order or adds to existing active order)
    // First check if active order is in a valid state
    const { data: activeData } = await $apollo.defaultClient.query({
      query: gql`query { activeOrder { id state } }`,
      fetchPolicy: 'network-only',
    })

    const activeOrder = activeData?.activeOrder
    if (activeOrder && !['AddingItems', 'ArrangingPayment'].includes(activeOrder.state)) {
      // Active order is completed — clear session token to force new order
      // Remove vendure auth token from cookies to reset session
      const tokenCookie = useCookie('vendure-auth-token')
      const sessionCookie = useCookie('session')
      const sessionSig = useCookie('session.sig')
      tokenCookie.value = null
      sessionCookie.value = null
      sessionSig.value = null

      // Re-login to establish fresh session
      const { ensureSession } = useAuth()
      const customer = await ensureSession()
      if (!customer) {
        paymentError.value = 'Sesi berakhir. Silakan login kembali.'
        navigateTo('/auth')
        return
      }
    }

    const { data: addData } = await $apollo.defaultClient.mutate({
      mutation: ADD_ITEM_TO_ORDER,
      variables: { productVariantId: variantId, quantity: 1 },
    })

    const addResult = addData?.addItemToOrder
    if (addResult?.__typename !== 'Order') {
      if (addResult?.__typename !== 'OrderModificationError') {
        paymentError.value = addResult?.message || 'Gagal menambahkan produk ke pesanan.'
        return
      }
    }

    // Step 2: Set shipping address (required by Vendure before ArrangingPayment)
    const { data: addrData } = await $apollo.defaultClient.mutate({
      mutation: SET_SHIPPING_ADDRESS,
      variables: {
        input: {
          fullName: fullName.value,
          streetLine1: 'Digital Delivery',
          city: 'Jakarta',
          countryCode: 'ID',
        },
      },
    })
    console.log('[Checkout] Step 2 - setShippingAddress:', JSON.stringify(addrData))

    // Step 3: Get and set eligible shipping method
    const { data: eligibleData } = await $apollo.defaultClient.query({
      query: GET_ELIGIBLE_SHIPPING,
      fetchPolicy: 'network-only',
    })
    const shippingMethods = eligibleData?.eligibleShippingMethods || []
    console.log('[Checkout] Step 3a - eligibleShippingMethods:', JSON.stringify(shippingMethods))

    if (shippingMethods.length > 0) {
      const { data: shipData } = await $apollo.defaultClient.mutate({
        mutation: SET_SHIPPING_METHOD,
        variables: { ids: [shippingMethods[0].id] },
      })
      console.log('[Checkout] Step 3b - setShippingMethod:', JSON.stringify(shipData))
    } else {
      paymentError.value = 'Tidak ada metode pengiriman yang tersedia. Pastikan Shipping Method sudah diatur di Dashboard.'
      return
    }

    // Step 4: Transition order to ArrangingPayment state
    const { data: transData } = await $apollo.defaultClient.mutate({
      mutation: TRANSITION_ORDER_STATE,
      variables: { state: 'ArrangingPayment' },
    })
    console.log('[Checkout] Step 4 - transitionOrderToState:', JSON.stringify(transData))

    const transResult = transData?.transitionOrderToState
    if (transResult?.__typename === 'OrderStateTransitionError') {
      paymentError.value = transResult.message || transResult.transitionError || 'Gagal transition ke ArrangingPayment.'
      return
    } else if (transResult?.__typename !== 'Order' || transResult?.state !== 'ArrangingPayment') {
      paymentError.value = `Order state unexpected: ${transResult?.state || 'unknown'}. Coba refresh.`
      return
    }

    // Step 4: Add payment with Tripay method
    const { data: payData } = await $apollo.defaultClient.mutate({
      mutation: ADD_PAYMENT_TO_ORDER,
      variables: {
        input: {
          method: 'tripay',
          metadata: { channelCode: selectedChannel.value },
        },
      },
    })

    const payResult = payData?.addPaymentToOrder
    if (payResult?.__typename === 'Order') {
      // Get payment URL from order payments metadata
      const payment = payResult.payments?.[payResult.payments.length - 1]
      console.log('[Checkout] Payment response:', JSON.stringify(payment, null, 2))
      let paymentUrl = ''

      // metadata bisa string JSON atau object tergantung Vendure version
      const meta = payment?.metadata
      if (meta) {
        if (typeof meta === 'string') {
          try {
            const parsed = JSON.parse(meta)
            paymentUrl = parsed?.public?.paymentUrl || parsed?.paymentUrl || ''
          } catch { /* not JSON */ }
        } else if (typeof meta === 'object') {
          paymentUrl = meta?.public?.paymentUrl || meta?.paymentUrl || ''
        }
      }

      console.log('[Checkout] Extracted paymentUrl:', paymentUrl)

      if (paymentUrl) {
        window.location.href = paymentUrl
      } else {
        // Fallback: redirect ke order confirmation page
        const orderCode = payResult.code
        navigateTo(`/order/${orderCode}`)
      }
    } else {
      paymentError.value = payResult?.message || payResult?.paymentErrorMessage || 'Gagal membuat pembayaran.'
    }
  } catch (err: any) {
    paymentError.value = err.message || 'Terjadi kesalahan saat memproses pembayaran.'
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.checkout-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.checkout-main {
  flex: 1;
  padding: 2rem 1.25rem 4rem;
}

.checkout-container {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}

/* Header */
.checkout-header {
  margin-bottom: 2rem;
}

.checkout-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}

.checkout-subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
  margin: 0;
  line-height: 1.5;
}

/* Grid */
.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
  align-items: start;
}

/* Loading */
.checkout-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.checkout-loading p {
  color: var(--text-muted);
  font-size: 0.92rem;
}

/* Section cards */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
  color: var(--text);
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

/* Billing form */
.billing-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
}

.form-input[readonly] {
  opacity: 0.75;
  cursor: default;
}

.billing-note {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0.5rem 0 0;
  line-height: 1.5;
}

.billing-link {
  color: var(--primary-text);
  text-decoration: none;
  font-weight: 600;
}

.billing-link:hover {
  text-decoration: underline;
}

/* Payment placeholder */
.payment-placeholder {
  display: flex;
  justify-content: center;
}

.payment-coming {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
}

.payment-coming p {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 500;
}

.payment-sub {
  font-size: 0.82rem;
  opacity: 0.7;
}

/* Security badges */
.security-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.85rem;
  background: var(--primary-soft);
  color: var(--primary-text);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
}

/* Summary card */
.summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  position: sticky;
  top: 100px;
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
}

/* Product item in summary */
.summary-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.summary-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.summary-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.summary-item-name {
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-item-license {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.summary-item-price {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* Rows */
.summary-divider {
  height: 1px;
  background: var(--border);
  margin: 1rem 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.summary-val {
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.summary-total {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0;
}

.summary-total .summary-val {
  color: var(--primary-text);
  font-size: 1.15rem;
}

/* CTA */
.checkout-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.9rem 1.5rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: inherit;
  border: none;
  cursor: not-allowed;
  background: var(--primary);
  color: var(--primary-contrast);
  opacity: 0.5;
  transition: opacity 0.18s;
}

/* Trust signals */
.trust-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Error state */
.checkout-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 0;
  text-align: center;
  color: var(--text-muted);
}

.checkout-error h2 {
  font-size: 1.2rem;
  color: var(--text);
  margin: 0;
}

.checkout-error p {
  margin: 0;
  font-size: 0.92rem;
}

/* Payment channels */
.payment-channels {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.channel-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.channel-group-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.channel-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.5rem;
}

.channel-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
}

.channel-option:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.channel-option.selected {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.channel-radio {
  accent-color: var(--primary);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.channel-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text);
}

.channel-logo {
  width: auto;
  height: 22px;
  max-width: 60px;
  object-fit: contain;
  flex-shrink: 0;
}

/* Payment error */
.payment-error {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  font-size: 0.88rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

[data-theme='dark'] .payment-error {
  background: rgba(185, 28, 28, 0.12);
  color: #fca5a5;
  border-color: rgba(185, 28, 28, 0.3);
}

/* Phone number warning for e-wallet */
.phone-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  margin-bottom: 0.75rem;
  color: #92400e;
}

[data-theme='dark'] .phone-warning {
  background: rgba(146, 64, 14, 0.12);
  border-color: rgba(252, 211, 77, 0.25);
  color: #fbbf24;
}

.phone-warning-content {
  flex: 1;
  min-width: 0;
}

.phone-warning-text {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.phone-warning-sub {
  font-size: 0.78rem;
  margin: 0.1rem 0 0;
  opacity: 0.85;
}

.phone-warning-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
  text-decoration: none;
  white-space: nowrap;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  background: rgba(146, 64, 14, 0.1);
  transition: background 0.15s;
}

.phone-warning-link:hover {
  background: rgba(146, 64, 14, 0.2);
}

[data-theme='dark'] .phone-warning-link {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

[data-theme='dark'] .phone-warning-link:hover {
  background: rgba(251, 191, 36, 0.2);
}

@media (max-width: 560px) {
  .phone-warning {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .phone-warning-link {
    width: 100%;
    text-align: center;
  }
}

/* CTA active state */
.checkout-cta:not(:disabled) {
  opacity: 1;
  cursor: pointer;
}

.checkout-cta:not(:disabled):hover {
  background: var(--primary-hover);
}

.btn-spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Responsive */
@media (max-width: 860px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    position: static;
  }
}

@media (max-width: 560px) {
  .checkout-header {
    margin-bottom: 1.5rem;
  }

  .checkout-title {
    font-size: 1.4rem;
  }

  .section-card {
    padding: 1.25rem;
  }

  .summary-card {
    padding: 1.25rem;
  }

  .security-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
