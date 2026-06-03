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

                <p class="billing-note">
                  Data di atas diambil dari akun Anda.
                  <NuxtLink to="/account" class="billing-link">Ubah di Pengaturan</NuxtLink>
                </p>
              </div>
            </div>

            <!-- Payment Method (placeholder) -->
            <div class="section-card">
              <div class="section-header">
                <AppIcon name="lock" :size="20" />
                <h2 class="section-title">Metode Pembayaran</h2>
              </div>

              <div class="payment-placeholder">
                <div class="payment-coming">
                  <AppIcon name="shoppingBag" :size="24" />
                  <p>Metode pembayaran akan segera tersedia.</p>
                  <span class="payment-sub">Transfer Bank, E-Wallet, dan QRIS via Tripay.</span>
                </div>
              </div>
            </div>

            <!-- Security badge -->
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

              <!-- CTA Button -->
              <button
                type="button"
                class="btn btn-primary btn-full checkout-cta"
                disabled
                aria-disabled="true"
              >
                <span>Lanjutkan Pembayaran</span>
                <AppIcon name="arrowRight" :size="18" />
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

useHead({
  title: 'Checkout - NgopiCode',
})

const route = useRoute()
const slug = route.params.slug as string

const { customer, ensureSession, isLoggedIn } = useAuth()
const loading = ref(true)
const product = ref<any>(null)

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
