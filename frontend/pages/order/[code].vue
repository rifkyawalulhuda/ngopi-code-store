<template>
  <div class="order-page">
    <TheHeader />

    <main class="order-main">
      <div class="order-container">
        <!-- Loading -->
        <div v-if="loading" class="order-loading">
          <div class="spinner" />
          <p>Memuat detail pesanan...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="order-error">
          <AppIcon name="close" :size="32" />
          <h1>Pesanan Tidak Ditemukan</h1>
          <p>{{ error }}</p>
          <NuxtLink to="/products" class="btn btn-primary">Kembali ke Katalog</NuxtLink>
        </div>

        <!-- Success State (Paid/Fulfilled) -->
        <div v-else-if="isSuccess && order" class="order-state">
          <!-- Back button -->
          <NuxtLink to="/account" class="back-link">
            <AppIcon name="arrowRight" :size="16" class="back-arrow" />
            Kembali ke Riwayat Pesanan
          </NuxtLink>

          <div class="state-badge state-success">
            <AppIcon name="check" :size="28" />
          </div>
          <h1 class="state-title">Pembayaran Berhasil!</h1>
          <p class="state-desc">
            Terima kasih atas pembelian Anda. Pesanan <strong>{{ order.code }}</strong> telah dikonfirmasi.
          </p>

          <!-- Order Summary -->
          <div class="summary-card">
            <OrderSummaryItems :order="order" />
          </div>

          <!-- Download CTA (digital products) -->
          <div v-if="!order.isRepeatable" class="action-card">
            <AppIcon name="download" :size="22" />
            <div>
              <h3>Produk Digital Siap Diunduh</h3>
              <p>Akses produk digital Anda di halaman unduhan.</p>
            </div>
            <NuxtLink :to="`/downloads/${order.code}`" class="btn btn-primary">
              Unduh Sekarang
            </NuxtLink>
          </div>

          <!-- Service/Repeatable product CTA -->
          <div v-else class="action-card service-card">
            <AppIcon name="check" :size="22" />
            <div>
              <h3>Pesanan Sedang Diproses</h3>
              <p>Tim kami akan menghubungi Anda via WhatsApp/Email dalam 1x24 jam untuk koordinasi.</p>
            </div>
          </div>

          <!-- WhatsApp contact for service orders -->
          <a
            v-if="order.isRepeatable && serviceWhatsappUrl"
            :href="serviceWhatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-whatsapp btn-full"
          >
            <AppIcon name="whatsapp" :size="18" />
            Hubungi via WhatsApp
          </a>
        </div>

        <!-- Pending State (Waiting Payment) -->
        <div v-else-if="isPending && order" class="order-state">
          <!-- Back button -->
          <NuxtLink to="/account" class="back-link">
            <AppIcon name="arrowRight" :size="16" class="back-arrow" />
            Kembali ke Riwayat Pesanan
          </NuxtLink>

          <div class="state-badge state-pending">
            <AppIcon name="shoppingBag" :size="28" />
          </div>
          <h1 class="state-title">Menunggu Pembayaran</h1>
          <p class="state-desc">
            Selesaikan pembayaran untuk pesanan <strong>{{ order.code }}</strong> agar produk digital bisa diakses.
          </p>

          <!-- Payment Instructions -->
          <div v-if="paymentMeta" class="payment-detail-card">
            <div class="pd-header">
              <span class="pd-method">{{ paymentMeta.paymentName || paymentMeta.channelCode }}</span>
              <span v-if="expiryFormatted" class="pd-expiry">
                Batas waktu: <strong>{{ expiryFormatted }}</strong>
              </span>
            </div>

            <!-- Pay Code (VA Number / Account Number) -->
            <div v-if="paymentMeta.payCode" class="pd-paycode">
              <span class="pd-paycode-label">Nomor Pembayaran</span>
              <div class="pd-paycode-row">
                <span class="pd-paycode-value">{{ paymentMeta.payCode }}</span>
                <button type="button" class="btn-copy" @click="copyPayCode" :aria-label="'Salin nomor pembayaran'">
                  {{ copied ? '✓ Disalin' : 'Salin' }}
                </button>
              </div>
            </div>

            <!-- Amount -->
            <div class="pd-amount">
              <span class="pd-amount-label">Total Pembayaran</span>
              <span class="pd-amount-value">{{ formatPriceIDR(order.total) }}</span>
            </div>

            <!-- Instructions -->
            <div v-if="paymentMeta.instructions?.length" class="pd-instructions">
              <div v-for="(group, idx) in paymentMeta.instructions" :key="idx" class="pd-instruction-group">
                <h4 class="pd-instruction-title">{{ group.title }}</h4>
                <ol class="pd-steps">
                  <li v-for="(step, sIdx) in group.steps" :key="sIdx" v-html="step"></li>
                </ol>
              </div>
            </div>

            <!-- Payment URL (if available, e.g. QRIS) -->
            <a
              v-if="paymentMeta.paymentUrl"
              :href="paymentMeta.paymentUrl"
              target="_blank"
              rel="noopener"
              class="btn btn-primary btn-full pd-pay-link"
            >
              Bayar Sekarang
              <AppIcon name="arrowRight" :size="16" />
            </a>
          </div>

          <!-- Order Summary -->
          <div class="summary-card">
            <OrderSummaryItems :order="order" />
          </div>

          <!-- Refresh -->
          <button type="button" class="btn btn-secondary btn-full" @click="refreshOrder">
            <AppIcon name="check" :size="16" />
            Refresh Status
          </button>
          <p class="refresh-note">Sudah bayar? Klik refresh untuk cek status terbaru.</p>
        </div>

        <!-- Failed/Expired -->
        <div v-else-if="isFailed && order" class="order-state">
          <div class="state-badge state-failed">
            <AppIcon name="close" :size="28" />
          </div>
          <h1 class="state-title">Pembayaran Gagal</h1>
          <p class="state-desc">
            Pembayaran untuk pesanan <strong>{{ order.code }}</strong>
            {{ paymentStatus === 'expired' ? 'telah kedaluwarsa' : 'tidak dapat diproses' }}.
          </p>

          <div class="summary-card">
            <OrderSummaryItems :order="order" />
          </div>

          <NuxtLink to="/products" class="btn btn-primary btn-full">
            Kembali ke Katalog
          </NuxtLink>
        </div>

        <!-- Unknown -->
        <div v-else class="order-state">
          <h1 class="state-title">Status Pesanan</h1>
          <p class="state-desc">Tidak dapat menentukan status pembayaran. Silakan cek email untuk konfirmasi.</p>
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
import { useOrderConfirmation } from '~/composables/useOrderConfirmation'
import { useWhatsapp } from '~/composables/useWhatsapp'
import { formatPriceIDR } from '~/utils/format'
import OrderSummaryItems from '~/components/OrderSummaryItems.vue'

const route = useRoute()

const {
  order,
  loading,
  error,
  paymentStatus,
  paymentMeta,
  isSuccess,
  isFailed,
  isPending,
  fetchOrderByCode,
} = useOrderConfirmation()

useHead({
  title: computed(() =>
    order.value ? `Pesanan ${order.value.code} - NgopiCode` : 'Pesanan - NgopiCode'
  ),
})

const copied = ref(false)

const expiryFormatted = computed(() => {
  if (!paymentMeta.value?.expiredTime) return ''
  const date = new Date(paymentMeta.value.expiredTime * 1000)
  return date.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})

function copyPayCode() {
  if (!paymentMeta.value?.payCode) return
  navigator.clipboard.writeText(paymentMeta.value.payCode)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// WhatsApp URL for service/repeatable orders — pre-filled with order details
const { whatsappNumber, fetchWhatsappNumber } = useWhatsapp()

const serviceWhatsappUrl = computed(() => {
  if (!whatsappNumber.value || !order.value) return ''
  const productNames = order.value.lines.map(l => l.productName).join(', ')
  const message = encodeURIComponent(
    `Halo, saya ingin konfirmasi pesanan:\n\n` +
    `📋 Order: #${order.value.code}\n` +
    `📦 Produk: ${productNames}\n` +
    `💰 Total: ${formatPriceIDR(order.value.total)}\n\n` +
    `👤 Nama: ${order.value.customerName || '-'}\n` +
    `📧 Email: ${order.value.customerEmail || '-'}\n` +
    `📱 WhatsApp: ${order.value.customerPhone || '-'}\n\n` +
    `Mohon informasi selanjutnya. Terima kasih!`
  )
  return `https://wa.me/${whatsappNumber.value}?text=${message}`
})

async function refreshOrder() {
  const code = route.params.code as string
  const status = route.query.status as string | undefined
  await fetchOrderByCode(code, status)
}

onMounted(async () => {
  // Ensure user session is active (might be lost after cross-site redirect from Tripay)
  const { ensureSession, isLoggedIn } = useAuth()
  await ensureSession()

  // If not logged in after redirect, send to login with return URL
  if (!isLoggedIn.value) {
    navigateTo(`/auth?redirect=/order/${route.params.code}`)
    return
  }

  const code = route.params.code as string
  const status = route.query.status as string | undefined
  await fetchOrderByCode(code, status)

  // Fetch owner WhatsApp number for service order contact
  fetchWhatsappNumber()
})
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.order-main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 2.5rem 1.25rem 4rem;
}

.order-container {
  max-width: 600px;
  width: 100%;
}

/* Loading */
.order-loading {
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

@keyframes spin { to { transform: rotate(360deg); } }

/* Error */
.order-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 0;
  text-align: center;
  color: var(--text-muted);
}

.order-error h1 { color: var(--text); font-size: 1.3rem; margin: 0; }

/* State layout */
.order-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

/* Back link */
.back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.4rem 0;
  margin-bottom: 0.5rem;
  transition: color 0.18s;
}

.back-link:hover {
  color: var(--primary-text);
}

.back-arrow {
  transform: rotate(180deg);
}

.state-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.state-success { background: var(--primary-soft); color: var(--primary-text); }
.state-pending { background: #fef3c7; color: #92400e; }
.state-failed { background: #fef2f2; color: #dc2626; }

[data-theme='dark'] .state-pending { background: rgba(146, 64, 14, 0.15); color: #fbbf24; }
[data-theme='dark'] .state-failed { background: rgba(220, 38, 38, 0.12); color: #fca5a5; }

.state-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.state-desc {
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
  max-width: 440px;
}

/* Summary card */
.summary-card {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.25rem;
  text-align: left;
  margin-top: 0.5rem;
}

/* Payment detail card */
.payment-detail-card {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem;
  text-align: left;
  margin-top: 0.5rem;
}

.pd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pd-method {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.pd-expiry {
  font-size: 0.8rem;
  color: #92400e;
  background: #fef3c7;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}

[data-theme='dark'] .pd-expiry {
  background: rgba(146, 64, 14, 0.15);
  color: #fbbf24;
}

/* Pay code */
.pd-paycode {
  margin-bottom: 1rem;
}

.pd-paycode-label {
  display: block;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
  font-weight: 500;
}

.pd-paycode-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 0.75rem 1rem;
}

.pd-paycode-value {
  flex: 1;
  font-size: 1.2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  color: var(--text);
}

.btn-copy {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--primary);
  background: var(--primary-soft);
  color: var(--primary-text);
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s;
  white-space: nowrap;
}

.btn-copy:hover {
  background: var(--primary);
  color: var(--primary-contrast);
}

/* Amount */
.pd-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.pd-amount-label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.pd-amount-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
}

/* Instructions */
.pd-instructions {
  margin-bottom: 1rem;
}

.pd-instruction-group {
  margin-bottom: 1rem;
}

.pd-instruction-group:last-child {
  margin-bottom: 0;
}

.pd-instruction-title {
  font-size: 0.88rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--text);
}

.pd-steps {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.7;
}

.pd-pay-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-decoration: none;
}

/* Action card (download) */
.action-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--primary-soft);
  border: 1px solid var(--primary);
  border-radius: 14px;
  padding: 1.25rem;
  text-align: left;
  margin-top: 0.5rem;
}

.action-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--primary-text); }
.action-card p { font-size: 0.82rem; color: var(--text-muted); margin: 0.2rem 0 0; }
.action-card .btn { margin-left: auto; white-space: nowrap; flex-shrink: 0; }

.service-card {
  border-color: var(--border);
  background: var(--surface);
}

.btn-whatsapp {
  background: #25D366;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  border-radius: 10px;
  padding: 0.8rem 1.25rem;
  text-decoration: none;
  transition: background 0.18s;
}

.btn-whatsapp:hover {
  background: #1da851;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: background 0.18s;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover { background: var(--primary-hover); }

.btn-secondary {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.btn-secondary:hover { background: var(--btn-ghost-hover, var(--surface-2)); }

.btn-full { width: 100%; }

.refresh-note {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0.5rem 0 0;
}

/* Responsive */
@media (max-width: 560px) {
  .action-card {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .action-card .btn { margin-left: 0; width: 100%; }
  .pd-paycode-value { font-size: 1rem; }
}

@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
}
</style>
