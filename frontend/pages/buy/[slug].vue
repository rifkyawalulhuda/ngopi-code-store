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

              <!-- Logged in: details taken from the account (read-only) -->
              <div v-if="isLoggedIn" class="billing-form">
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
                    v-model="customerPhoneInput"
                    type="tel"
                    class="form-input"
                    placeholder="0812xxxxxxx"
                    autocomplete="tel"
                    :aria-invalid="!!customerPhoneError"
                    :class="{ 'input-invalid': customerPhoneError }"
                    @blur="saveCustomerPhone"
                  />
                  <span v-if="customerPhoneError" class="field-error">{{ customerPhoneError }}</span>
                  <span v-else-if="phoneSaveError" class="field-error">{{ phoneSaveError }}</span>
                  <span v-else-if="savingPhone" class="field-hint">Menyimpan…</span>
                  <span v-else class="field-hint">
                    Dipakai untuk mengirim bukti &amp; akses pesanan via WhatsApp.
                  </span>
                </div>

                <p class="billing-note">
                  Email dan nama diambil dari akun Anda.
                  <NuxtLink to="/account" class="billing-link">Ubah di Pengaturan</NuxtLink>
                </p>
              </div>

              <!-- Guest: enter details directly, no account required -->
              <div v-else class="billing-form">
                <div class="form-group">
                  <label class="form-label" for="guest-email">Email Address</label>
                  <input
                    id="guest-email"
                    v-model="guestForm.email"
                    type="email"
                    class="form-input"
                    placeholder="nama@email.com"
                    autocomplete="email"
                    :class="{ 'input-invalid': guestErrors.email }"
                  />
                  <span v-if="guestErrors.email" class="field-error">{{ guestErrors.email }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label" for="guest-name">Nama Lengkap</label>
                  <input
                    id="guest-name"
                    v-model="guestForm.fullName"
                    type="text"
                    class="form-input"
                    placeholder="Nama lengkap Anda"
                    autocomplete="name"
                    :class="{ 'input-invalid': guestErrors.fullName }"
                  />
                  <span v-if="guestErrors.fullName" class="field-error">{{ guestErrors.fullName }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label" for="guest-phone">No. Telepon / WhatsApp</label>
                  <input
                    id="guest-phone"
                    v-model="guestForm.whatsappNumber"
                    type="tel"
                    class="form-input"
                    placeholder="0812xxxxxxx"
                    autocomplete="tel"
                    :class="{ 'input-invalid': guestErrors.whatsappNumber }"
                  />
                  <span v-if="guestErrors.whatsappNumber" class="field-error">{{ guestErrors.whatsappNumber }}</span>
                </div>

                <p class="billing-note">
                  Belum punya akun? Tidak masalah — isi data di atas dan tautan download akan dikirim ke email Anda.
                  <NuxtLink to="/auth" class="billing-link">Masuk / Daftar</NuxtLink>
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
              <NuxtLink
                v-if="showPendingOrderHint"
                to="/account?tab=orders"
                class="payment-error-link"
              >
                Lihat Pesanan Tertunda
                <AppIcon name="arrowRight" :size="14" />
              </NuxtLink>
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
                  <span class="summary-item-license">{{ selectedLicenseLabel || 'Personal License' }}</span>
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

              <!--
                E-wallet needs a phone number. Point at the field on THIS page —
                the old copy sent everyone to Pengaturan Profil, a dead end for
                guests who have no profile to open.
              -->
              <div v-if="needsPhone" class="phone-warning" role="status">
                <AppIcon name="user" :size="18" />
                <div class="phone-warning-content">
                  <p class="phone-warning-text">Metode E-Wallet memerlukan nomor WhatsApp.</p>
                  <p class="phone-warning-sub">
                    Isi kolom <strong>No. Telepon / WhatsApp</strong> di Detail Pembeli.
                  </p>
                </div>
                <button type="button" class="phone-warning-link" @click="focusPhoneField">
                  Isi Nomor
                </button>
              </div>

              <!-- CTA Button -->
              <button
                type="button"
                class="btn btn-primary btn-full checkout-cta"
                :disabled="!selectedChannel || processing || needsPhone || formInvalid"
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

        <!--
          Mobile-only sticky action bar.
          On phones the order summary (and therefore the CTA) sits far below the
          fold, so the primary action must stay thumb-reachable. Desktop keeps
          the in-card CTA instead.
        -->
        <div v-if="product" class="mobile-checkout-bar">
          <div class="mcb-inner">
            <div class="mcb-total">
              <span class="mcb-label">Total</span>
              <span class="mcb-value">{{ formattedPrice }}</span>
            </div>
            <button
              type="button"
              class="btn btn-primary mcb-cta"
              :disabled="!selectedChannel || processing || needsPhone || formInvalid"
              @click="onProceedPayment"
            >
              <span v-if="processing" class="btn-spinner-sm" />
              <template v-else>
                Bayar
                <AppIcon name="arrowRight" :size="17" />
              </template>
            </button>
          </div>
          <p v-if="disabledReason" class="mcb-hint">{{ disabledReason }}</p>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { GET_PRODUCT_BY_SLUG } from '~/graphql/queries/products'
import { formatPriceIDR } from '~/utils/format'
import { pickVariant, getLicenseLabel, productRequiresFile } from '~/utils/variants'
import { isOrderTotalConsistent } from '~/utils/checkout'
import { phoneFieldError } from '~/utils/phone'
import gql from 'graphql-tag'

const SET_CUSTOMER_FOR_ORDER = gql`
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
        code
      }
      ... on AlreadyLoggedInError {
        message
      }
      ... on EmailAddressConflictError {
        message
      }
      ... on GuestCheckoutError {
        message
        errorDetail
      }
      ... on NoActiveOrderError {
        message
      }
    }
  }
`

const REMOVE_ALL_ORDER_LINES = gql`
  mutation RemoveAllOrderLines {
    removeAllOrderLines {
      ... on Order {
        id
        code
        totalWithTax
        totalQuantity
      }
      ... on OrderModificationError {
        message
      }
    }
  }
`

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

const { customer, ensureSession, isLoggedIn, updateProfile } = useAuth()
const loading = ref(true)
const product = ref<any>(null)
const selectedChannel = ref('')
const processing = ref(false)
const paymentError = ref('')
const showPendingOrderHint = ref(false)

/**
 * The license tier chosen on the PDP, carried via ?license=extended.
 * Resolved against the fetched product once it loads; falls back to the first
 * purchasable variant so a direct link to /buy/<slug> still works.
 */
const selectedVariant = computed(() => {
  const variants = product.value?.variants ?? []
  if (!variants.length) return null
  const preferred = (route.query.license as string | undefined) ?? null
  // Services have no file, so a fileless service variant is still selectable.
  return pickVariant(variants, {
    preferredLicenseCode: preferred,
    requiresFile: productRequiresFile(product.value?.facetValues),
  })
})

/** License tier label for the order summary, e.g. "Extended". */
const selectedLicenseLabel = computed(() => getLicenseLabel(selectedVariant.value))

// Guest checkout form (used when the visitor is not logged in)
const guestForm = reactive({
  email: '',
  fullName: '',
  whatsappNumber: '',
})
const guestErrors = reactive<{ email: string | null; fullName: string | null; whatsappNumber: string | null }>({
  email: null,
  fullName: null,
  whatsappNumber: null,
})

function computeGuestErrors(form: { email: string; fullName: string; whatsappNumber: string }) {
  const email = form.email.trim()
  const name = form.fullName.trim()

  return {
    email: !email
      ? 'Email wajib diisi'
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? null
        : 'Format email tidak valid',
    fullName: name.length < 2 ? 'Nama lengkap wajib diisi' : null,
    // Guests always need a phone: it is the WhatsApp delivery channel.
    whatsappNumber: phoneFieldError(form.whatsappNumber, { required: true }),
  }
}

const guestFormValid = computed(() => {
  const e = computeGuestErrors(guestForm)
  return !e.email && !e.fullName && !e.whatsappNumber
})

function validateGuestForm(): boolean {
  Object.assign(guestErrors, computeGuestErrors(guestForm))
  return !guestErrors.email && !guestErrors.fullName && !guestErrors.whatsappNumber
}

/**
 * Logged-in customers can fix their WhatsApp number inline instead of being sent
 * away to the account settings page mid-checkout. The value is persisted through
 * useAuth.updateProfile so the order — and the WhatsApp receipt — carries it.
 */
const customerPhoneInput = ref('')
const savingPhone = ref(false)
const phoneSaveError = ref('')

// Seed the field whenever the customer record arrives or changes.
watch(
  () => customer.value?.customFields?.whatsappNumber,
  (phone) => {
    customerPhoneInput.value = phone || ''
  },
  { immediate: true },
)

/** Inline validation for the logged-in field. Empty is allowed until a method needs it. */
const customerPhoneError = computed(() => phoneFieldError(customerPhoneInput.value))

/** True when the field holds a value that differs from what is saved on the account. */
const phoneDirty = computed(
  () => customerPhoneInput.value.trim() !== (customer.value?.customFields?.whatsappNumber || '').trim(),
)

/** Persist the phone to the customer profile. Returns false when it must not proceed. */
async function saveCustomerPhone(): Promise<boolean> {
  if (!isLoggedIn.value || !phoneDirty.value) return true
  if (customerPhoneError.value) return false

  savingPhone.value = true
  phoneSaveError.value = ''
  try {
    const ok = await updateProfile({ whatsappNumber: customerPhoneInput.value.trim() })
    if (!ok) {
      phoneSaveError.value = 'Gagal menyimpan nomor WhatsApp. Coba lagi.'
      return false
    }
    return true
  } finally {
    savingPhone.value = false
  }
}

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
const customerPhone = computed(() =>
  isLoggedIn.value
    ? customerPhoneInput.value.trim().replace(/[\s-]/g, '')
    : guestForm.whatsappNumber.trim().replace(/[\s-]/g, ''),
)
const needsPhone = computed(() => isEwalletSelected.value && !customerPhone.value)

/** Id of the phone input on this page, depending on who is checking out. */
const phoneFieldId = computed(() => (isLoggedIn.value ? 'ck-phone' : 'guest-phone'))

/**
 * Send the customer to the phone field that is already on this page.
 *
 * The hint used to point at Pengaturan Profil, which a guest does not have —
 * a dead end while the field they needed sat a few lines above.
 */
function focusPhoneField() {
  if (!import.meta.client) return
  const el = document.getElementById(phoneFieldId.value) as HTMLInputElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.focus({ preventScroll: true })
}

/**
 * Why the primary action is disabled, phrased for the sticky mobile bar.
 *
 * A disabled button with no explanation is the classic dead end — especially on
 * mobile where the reason may be scrolled off-screen. Returns null when the
 * action is available.
 */
const disabledReason = computed<string | null>(() => {
  if (processing.value) return 'Memproses pembayaran…'
  if (!selectedChannel.value) return 'Pilih metode pembayaran dulu'
  if (needsPhone.value) return 'Isi nomor WhatsApp dulu'
  if (isLoggedIn.value ? customerPhoneError.value : !guestFormValid.value) {
    return 'Lengkapi data pembeli dulu'
  }
  return null
})

/** True when the buyer's details are incomplete or invalid. */
const formInvalid = computed(() =>
  isLoggedIn.value ? !!customerPhoneError.value : !guestFormValid.value,
)

const fullName = computed(() => {
  if (isLoggedIn.value && customer.value) {
    return `${customer.value.firstName} ${customer.value.lastName}`.trim()
  }
  return guestForm.fullName.trim()
})

const formattedPrice = computed(() => {
  const price = selectedVariant.value?.price
  return price != null ? formatPriceIDR(price) : 'Rp 0'
})

onMounted(async () => {
  // Check for an existing session, but do NOT require one — guests may check out
  // by filling in their details directly.
  await ensureSession()

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
 * Flow: removeAllOrderLines (clean slate) → addItemToOrder → setCustomerForOrder
 * (guests) → setOrderShippingAddress → setOrderShippingMethod →
 * transitionOrderToState(ArrangingPayment) → addPaymentToOrder(tripay) →
 * redirect to the Tripay paymentUrl.
 *
 * Every step's result is checked: a failure must stop the flow, because the
 * item is already in the order and a retry would add it a second time.
 */
async function onProceedPayment() {
  if (!selectedChannel.value || !product.value) return

  // Guests must provide their details before we can create the order customer.
  if (!isLoggedIn.value && !validateGuestForm()) {
    paymentError.value = 'Lengkapi data pembeli terlebih dahulu.'
    return
  }

  // Logged-in: persist any inline phone edit BEFORE creating the order, so the
  // order — and the WhatsApp receipt — carries the number just typed. Saving on
  // blur alone is not enough: the customer may click straight after typing.
  if (isLoggedIn.value && !(await saveCustomerPhone())) {
    paymentError.value =
      phoneSaveError.value || customerPhoneError.value || 'Nomor WhatsApp belum valid.'
    return
  }

  processing.value = true
  paymentError.value = ''
  showPendingOrderHint.value = false

  try {
    const { $apollo } = useNuxtApp()
    const variantId = selectedVariant.value?.id
    if (!variantId) {
      paymentError.value = 'Produk tidak memiliki varian yang valid.'
      return
    }

    // Step 1: Start from a CLEAN order.
    //
    // The Vendure session carries an active order for a long time (default
    // session duration is a year), so a previously abandoned order would still
    // hold its lines. Adding to it silently changed what the customer pays
    // while this page kept showing only the selected variant's price.
    // "Beli Sekarang" means exactly one product, so clear first.
    await $apollo.defaultClient.mutate({
      mutation: REMOVE_ALL_ORDER_LINES,
      fetchPolicy: 'no-cache',
    })

    // Step 2: Add the selected variant.
    const { data: addData } = await $apollo.defaultClient.mutate({
      mutation: ADD_ITEM_TO_ORDER,
      variables: { productVariantId: variantId, quantity: 1 },
    })

    const addResult = addData?.addItemToOrder
    // Any non-Order result is fatal. Previously OrderModificationError was
    // swallowed and the flow continued, so checkout could proceed with the
    // item missing from the order.
    if (addResult?.__typename !== 'Order') {
      paymentError.value =
        addResult?.message || 'Gagal menambahkan produk ke pesanan. Coba muat ulang halaman.'
      return
    }

    // Step 2b: Verify what will actually be charged matches what is displayed.
    // Guards against any future drift between the summary and the real order.
    if (!isOrderTotalConsistent(selectedVariant.value?.price, addResult.totalWithTax)) {
      paymentError.value =
        'Total pesanan tidak sesuai dengan yang ditampilkan. Pesanan dibatalkan demi keamanan — silakan muat ulang halaman.'
      return
    }

    // Step 1b: For guests, attach the customer to the order.
    // Must happen while the order is still in AddingItems, before ArrangingPayment.
    if (!isLoggedIn.value) {
      const nameParts = guestForm.fullName.trim().split(/\s+/)
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || '-'

      const { data: custData } = await $apollo.defaultClient.mutate({
        mutation: SET_CUSTOMER_FOR_ORDER,
        variables: {
          input: {
            emailAddress: guestForm.email.trim(),
            firstName,
            lastName,
            customFields: {
              whatsappNumber: guestForm.whatsappNumber.trim().replace(/[\s-]/g, ''),
            },
          },
        },
      })

      const custResult = custData?.setCustomerForOrder
      if (custResult?.__typename === 'EmailAddressConflictError') {
        paymentError.value =
          'Email ini sudah terdaftar. Silakan masuk ke akun Anda atau minta tautan akses pesanan.'
        return
      }
      if (custResult?.__typename === 'GuestCheckoutError') {
        paymentError.value =
          custResult.errorDetail || 'Checkout tamu sedang tidak tersedia. Silakan masuk terlebih dahulu.'
        return
      }
      if (custResult?.__typename !== 'Order') {
        paymentError.value = custResult?.message || 'Gagal menyimpan data pembeli.'
        return
      }
    }

    // Step 3: Set shipping address (required by Vendure before ArrangingPayment).
    // The result must be checked: if the address is rejected the order can never
    // reach ArrangingPayment, and the failure was previously invisible.
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

    const addrResult = addrData?.setOrderShippingAddress
    if (addrResult?.__typename !== 'Order') {
      paymentError.value =
        addrResult?.message || 'Gagal menyimpan alamat pengiriman. Coba muat ulang halaman.'
      return
    }

    // Step 4: Get and set eligible shipping method
    const { data: eligibleData } = await $apollo.defaultClient.query({
      query: GET_ELIGIBLE_SHIPPING,
      fetchPolicy: 'network-only',
    })
    const shippingMethods = eligibleData?.eligibleShippingMethods || []

    if (!shippingMethods.length) {
      paymentError.value = 'Tidak ada metode pengiriman yang tersedia. Pastikan Shipping Method sudah diatur di Dashboard.'
      return
    }

    const { data: shipData } = await $apollo.defaultClient.mutate({
      mutation: SET_SHIPPING_METHOD,
      variables: { ids: [shippingMethods[0].id] },
    })

    const shipResult = shipData?.setOrderShippingMethod
    if (shipResult?.__typename !== 'Order') {
      paymentError.value =
        shipResult?.message || 'Gagal menetapkan metode pengiriman. Coba muat ulang halaman.'
      return
    }

    // Step 5: Transition order to ArrangingPayment state
    const { data: transData } = await $apollo.defaultClient.mutate({
      mutation: TRANSITION_ORDER_STATE,
      variables: { state: 'ArrangingPayment' },
    })

    const transResult = transData?.transitionOrderToState
    if (transResult?.__typename === 'OrderStateTransitionError') {
      const msg = transResult.message || ''
      // Order already in ArrangingPayment = pending unpaid payment exists
      if (msg.includes('ArrangingPayment" to "ArrangingPayment')) {
        paymentError.value = 'Kamu masih memiliki pesanan yang menunggu pembayaran. Selesaikan atau batalkan pembayaran tersebut di halaman Riwayat Pesanan sebelum membuat pesanan baru.'
        showPendingOrderHint.value = true
        return
      }
      // Order in a completed state (Fulfilled/Delivered)
      if (msg.includes('Fulfilled') || msg.includes('Delivered') || msg.includes('PaymentSettled')) {
        paymentError.value = 'Sesi pesanan sebelumnya sudah selesai. Silakan muat ulang halaman untuk memulai pembelian baru.'
        return
      }
      paymentError.value = transResult.message || transResult.transitionError || 'Gagal memproses pesanan.'
      return
    } else if (transResult?.__typename !== 'Order' || transResult?.state !== 'ArrangingPayment') {
      paymentError.value = `Status pesanan tidak terduga: ${transResult?.state || 'unknown'}. Coba muat ulang halaman.`
      return
    }

    // Step 6: Add payment with Tripay method
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
  /* dvh keeps the layout correct when mobile browser chrome (URL bar) shows or
     hides; 100vh overflows in that case. Declared after vh as a fallback. */
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.checkout-main {
  flex: 1;
  padding: 2rem 1.25rem 4rem;
  overflow-x: hidden;
}

.checkout-container {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  min-width: 0;
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
  overflow-wrap: break-word;
  word-break: break-word;
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

.checkout-grid > * {
  min-width: 0;
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
  /* 16px minimum: anything smaller makes iOS Safari zoom the page on focus,
     which shifts the layout mid-checkout. */
  font-size: 16px;
  font-family: inherit;
  outline: none;
}

.form-input[readonly] {
  opacity: 0.75;
  cursor: default;
}

.input-invalid {
  border-color: #dc2626;
}

[data-theme='dark'] .input-invalid {
  border-color: #f87171;
}

.field-error {
  font-size: 0.78rem;
  color: #dc2626;
  line-height: 1.4;
}

[data-theme='dark'] .field-error {
  color: #fca5a5;
}

/* Persistent helper text under a form field */
.field-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
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
  overflow-wrap: break-word;
  word-break: break-word;
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

.payment-error-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.6rem;
  font-weight: 600;
  color: #b91c1c;
  text-decoration: underline;
  font-size: 0.85rem;
}

.payment-error-link:hover {
  opacity: 0.8;
}

[data-theme='dark'] .payment-error-link {
  color: #fca5a5;
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
  font-family: inherit;
  color: #92400e;
  text-decoration: none;
  white-space: nowrap;
  padding: 0.35rem 0.7rem;
  border: none;
  border-radius: 6px;
  background: rgba(146, 64, 14, 0.1);
  cursor: pointer;
  transition: background 0.15s;
}

.phone-warning-link:focus-visible {
  outline: 2px solid #92400e;
  outline-offset: 2px;
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

/* ============================================================
   Mobile-only sticky action bar
   ============================================================ */
.mobile-checkout-bar {
  display: none;
}

@media (max-width: 860px) {
  .mobile-checkout-bar {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    background: var(--surface);
    border-top: 1px solid var(--border);
    box-shadow: 0 -4px 18px var(--shadow-card);
    /* Keep the bar clear of the iOS home indicator / Android gesture bar */
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  }

  .mcb-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .mcb-total {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex-shrink: 0;
    min-width: 0;
  }

  .mcb-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.2;
  }

  .mcb-value {
    font-size: 1.02rem;
    font-weight: 800;
    color: var(--primary-text);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  .mcb-cta {
    flex: 1;
    min-width: 0;
    /* 48px: comfortably above the 44px minimum for a primary action */
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: none;
    border-radius: 12px;
    background: var(--primary);
    color: var(--primary-contrast);
    font-family: inherit;
    font-size: 0.98rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s ease;
  }

  .mcb-cta:not(:disabled):active {
    background: var(--primary-hover);
  }

  .mcb-cta:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mcb-hint {
    max-width: 1100px;
    margin: 0.5rem auto 0;
    font-size: 0.76rem;
    color: var(--text-muted);
    text-align: center;
  }

  /* The in-card CTA is redundant once the sticky bar exists */
  .checkout-cta {
    display: none;
  }

  /* Reserve room so the fixed bar never covers the last content */
  .checkout-main {
    padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
  }
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

  /* Tighter payment channel rows on small phones so the page stays short */
  .channel-option {
    padding: 0.65rem 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner,
  .btn-spinner-sm {
    animation: none;
  }

  .mcb-cta {
    transition: none;
  }
}

/* Keyboard focus must stay visible on the sticky action */
.mcb-cta:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
