<template>
  <div class="receipt-page">
    <!-- Print/PDF hides navigation -->
    <header class="receipt-topbar no-print">
      <NuxtLink to="/account?tab=orders" class="back-link">
        <AppIcon name="arrowLeft" :size="18" />
        Kembali ke Riwayat Pesanan
      </NuxtLink>
      <div class="topbar-actions">
        <button type="button" class="action-btn" aria-label="Download PDF" @click="onDownloadPdf">
          <AppIcon name="download" :size="18" />
          <span class="action-label">Download PDF</span>
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="receipt-state">
      <div class="receipt-spinner" />
      <p>Memuat bukti transaksi...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="receipt-state receipt-error">
      <AppIcon name="close" :size="32" />
      <h2>Pesanan Tidak Ditemukan</h2>
      <p>{{ error }}</p>
      <NuxtLink to="/account?tab=orders" class="btn btn-primary">Kembali</NuxtLink>
    </div>

    <!-- Receipt content -->
    <article v-else-if="order" ref="receiptRef" class="receipt-card" aria-label="Bukti Transaksi">
      <!-- Header -->
      <div class="receipt-header">
        <div class="receipt-brand">
          <span class="brand-mark">
            <AppIcon name="terminal" :size="20" />
          </span>
          <span class="brand-name">Ngopi<span class="brand-accent">Code</span></span>
        </div>
        <div class="receipt-title-block">
          <h1 class="receipt-title">Bukti Transaksi</h1>
          <span class="receipt-subtitle">Transaction Receipt</span>
        </div>
      </div>

      <!-- Meta row -->
      <div class="receipt-meta">
        <div class="meta-item">
          <span class="meta-label">No. Pesanan</span>
          <span class="meta-value mono">{{ order.code }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Tanggal</span>
          <span class="meta-value">{{ formatDate(order.orderPlacedAt) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status</span>
          <span class="status-badge" :class="statusClass">
            <AppIcon name="checkCircle" :size="14" />
            {{ statusLabel }}
          </span>
        </div>
      </div>

      <!-- Buyer info -->
      <section class="receipt-section">
        <h2 class="section-title">Detail Pembeli</h2>
        <div class="buyer-info">
          <p class="buyer-name">{{ order.customer.firstName }} {{ order.customer.lastName }}</p>
          <p class="buyer-detail">{{ order.customer.emailAddress }}</p>
        </div>
      </section>

      <!-- Items table -->
      <section class="receipt-section">
        <h2 class="section-title">Produk yang Dibeli</h2>
        <div class="items-table-wrap">
          <table class="items-table" aria-label="Daftar produk">
            <thead>
              <tr>
                <th class="col-desc">Produk</th>
                <th class="col-qty">Qty</th>
                <th class="col-price">Harga</th>
                <th class="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in order.lines" :key="line.id">
                <td class="col-desc">
                  <span class="item-name">{{ line.productVariant.name }}</span>
                  <span v-if="line.productVariant.sku" class="item-sku">SKU: {{ line.productVariant.sku }}</span>
                </td>
                <td class="col-qty">{{ line.quantity }}</td>
                <td class="col-price">{{ formatPrice(line.unitPriceWithTax) }}</td>
                <td class="col-total">{{ formatPrice(line.linePriceWithTax) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Totals -->
      <section class="receipt-section receipt-totals">
        <div class="totals-grid">
          <div class="total-row">
            <span>Subtotal</span>
            <span class="mono">{{ formatPrice(order.subTotalWithTax) }}</span>
          </div>
          <div v-if="order.shippingWithTax > 0" class="total-row">
            <span>Pengiriman</span>
            <span class="mono">{{ formatPrice(order.shippingWithTax) }}</span>
          </div>
          <div class="total-row total-row-final">
            <span>Total</span>
            <span class="mono total-amount">{{ formatPrice(order.totalWithTax) }}</span>
          </div>
        </div>
      </section>

      <!-- Payment details -->
      <section class="receipt-section">
        <h2 class="section-title">Detail Pembayaran</h2>
        <div class="payment-info">
          <div class="payment-row">
            <span class="payment-label">Metode</span>
            <span class="payment-value">
              <AppIcon name="creditCard" :size="16" />
              {{ paymentMethodLabel }}
            </span>
          </div>
          <div v-if="transactionId" class="payment-row">
            <span class="payment-label">ID Transaksi</span>
            <span class="payment-value mono">{{ transactionId }}</span>
          </div>
          <div v-if="paymentDate" class="payment-row">
            <span class="payment-label">Tanggal Bayar</span>
            <span class="payment-value">{{ paymentDate }}</span>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="receipt-footer">
        <p class="footer-thanks">Terima kasih atas pembelian Anda!</p>
        <p class="footer-contact">
          Jika ada pertanyaan, hubungi saya di
          <a :href="`mailto:${ownerEmail}`">{{ ownerEmail }}</a>
        </p>
      </footer>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatPriceIDR } from '~/utils/format'
import { useWhatsapp } from '~/composables/useWhatsapp'

useHead({
  title: 'Bukti Transaksi - NgopiCode',
})

const { ownerEmail, fetchWhatsappNumber } = useWhatsapp()

interface OrderLine {
  id: string
  quantity: number
  unitPriceWithTax: number
  linePriceWithTax: number
  productVariant: { id: string; name: string; sku: string }
}

interface PaymentInfo {
  id: string
  method: string
  amount: number
  state: string
  transactionId: string
  metadata: any
  createdAt: string
}

interface ReceiptOrder {
  id: string
  code: string
  state: string
  orderPlacedAt: string
  subTotalWithTax: number
  shippingWithTax: number
  totalWithTax: number
  currencyCode: string
  customer: {
    firstName: string
    lastName: string
    emailAddress: string
  }
  lines: OrderLine[]
  payments: PaymentInfo[]
}

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)
const order = ref<ReceiptOrder | null>(null)
const receiptRef = ref<HTMLElement | null>(null)

const statusLabel = computed(() => {
  if (!order.value) return ''
  const map: Record<string, string> = {
    PaymentSettled: 'Lunas',
    Fulfilled: 'Selesai',
    Delivered: 'Terkirim',
    ArrangingPayment: 'Menunggu Bayar',
    Cancelled: 'Dibatalkan',
  }
  return map[order.value.state] || order.value.state
})

const statusClass = computed(() => {
  if (!order.value) return ''
  if (['PaymentSettled', 'Fulfilled', 'Delivered'].includes(order.value.state)) return 'status-success'
  if (order.value.state === 'ArrangingPayment') return 'status-pending'
  if (order.value.state === 'Cancelled') return 'status-danger'
  return ''
})

const paymentMethodLabel = computed(() => {
  if (!order.value?.payments?.length) return '—'
  const payment = order.value.payments[0]
  const meta = payment.metadata
  if (meta) {
    const pub = typeof meta === 'string' ? (() => { try { return JSON.parse(meta) } catch { return null } })() : meta
    const name = pub?.public?.paymentName || pub?.paymentName || ''
    if (name) return name
    const code = pub?.public?.channelCode || pub?.channelCode || ''
    if (code) return code
  }
  return payment.method === 'tripay' ? 'Tripay' : payment.method || '—'
})

const transactionId = computed(() => {
  if (!order.value?.payments?.length) return ''
  const payment = order.value.payments[0]
  return payment.transactionId || ''
})

const paymentDate = computed(() => {
  if (!order.value?.payments?.length) return ''
  const payment = order.value.payments[0]
  if (!payment.createdAt) return ''
  return formatDate(payment.createdAt)
})

function formatPrice(amount: number): string {
  return formatPriceIDR(amount)
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function onDownloadPdf() {
  window.print()
}

onMounted(async () => {
  fetchWhatsappNumber()
  const code = route.params.code as string
  if (!code) {
    error.value = 'Kode pesanan tidak tersedia.'
    loading.value = false
    return
  }

  try {
    const { $apollo } = useNuxtApp()

    // Use inline query — connector will be wired later
    const { data } = await $apollo.defaultClient.query({
      query: (await import('~/graphql/queries/order')).GET_ORDER_BY_CODE,
      variables: { code },
      fetchPolicy: 'network-only',
    })

    const rawOrder = data?.orderByCode
    if (!rawOrder) {
      error.value = 'Pesanan tidak ditemukan atau Anda tidak memiliki akses.'
      loading.value = false
      return
    }

    order.value = rawOrder as ReceiptOrder
  } catch (err: any) {
    error.value = 'Gagal memuat data pesanan. Silakan coba lagi.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.receipt-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem 3rem;
}

/* Top bar */
.receipt-topbar {
  width: 100%;
  max-width: 800px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}

.back-link:hover {
  color: var(--primary-text);
}

.topbar-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
}

.action-btn:hover {
  background: var(--surface-2);
  border-color: var(--primary);
}

.action-btn:active {
  transform: scale(0.97);
}

/* Receipt card */
.receipt-card {
  width: 100%;
  max-width: 800px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px var(--shadow-card);
}

/* Header */
.receipt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.75rem 2rem;
  border-bottom: 1px solid var(--border);
  gap: 1rem;
  flex-wrap: wrap;
}

.receipt-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
}

.brand-name {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.brand-accent {
  color: var(--primary-text);
}

.receipt-title-block {
  text-align: right;
}

.receipt-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.receipt-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Meta */
.receipt-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.meta-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
}

.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.88rem;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  width: fit-content;
}

.status-success {
  background: var(--primary-soft);
  color: var(--primary-text);
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-danger {
  background: #fef2f2;
  color: #b91c1c;
}

[data-theme='dark'] .status-pending {
  background: rgba(217, 119, 6, 0.15);
  color: #fbbf24;
}

[data-theme='dark'] .status-danger {
  background: rgba(185, 28, 28, 0.15);
  color: #fca5a5;
}

/* Sections */
.receipt-section {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
}

.receipt-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 0.88rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin: 0 0 1rem;
}

/* Buyer */
.buyer-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.buyer-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.buyer-detail {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

/* Items table */
.items-table-wrap {
  overflow-x: auto;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.items-table th {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 2px solid var(--border);
}

.items-table td {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

.items-table tbody tr:last-child td {
  border-bottom: none;
}

.col-qty,
.col-price,
.col-total {
  text-align: right;
  white-space: nowrap;
}

.col-qty {
  width: 60px;
}

.col-price,
.col-total {
  width: 130px;
  font-variant-numeric: tabular-nums;
}

.item-name {
  display: block;
  font-weight: 600;
  line-height: 1.4;
}

.item-sku {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* Totals */
.receipt-totals {
  background: var(--surface-2);
}

.totals-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 320px;
  margin-left: auto;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.total-row-final {
  padding-top: 0.75rem;
  border-top: 2px solid var(--border);
  margin-top: 0.25rem;
  color: var(--text);
  font-weight: 700;
  font-size: 1.05rem;
}

.total-amount {
  color: var(--primary-text);
  font-size: 1.15rem;
}

/* Payment info */
.payment-info {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.payment-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.payment-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  min-width: 110px;
  flex-shrink: 0;
}

.payment-value {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Footer */
.receipt-footer {
  padding: 1.5rem 2rem;
  text-align: center;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.footer-thanks {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
  color: var(--text);
}

.footer-contact {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.footer-contact a {
  color: var(--primary-text);
  text-decoration: none;
}

.footer-contact a:hover {
  text-decoration: underline;
}

/* Loading / error states */
.receipt-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-muted);
}

.receipt-error {
  color: var(--text);
}

.receipt-error h2 {
  margin: 1rem 0 0.5rem;
  font-size: 1.3rem;
}

.receipt-error p {
  color: var(--text-muted);
  margin: 0 0 1.5rem;
}

.receipt-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }

  .receipt-page {
    background: #fff !important;
    padding: 0 !important;
    min-height: auto;
  }

  .receipt-card {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    max-width: none;
  }

  .receipt-header,
  .receipt-meta,
  .receipt-section,
  .receipt-totals,
  .receipt-footer {
    background: #fff !important;
  }

  .receipt-card,
  .receipt-header,
  .receipt-meta,
  .receipt-section,
  .receipt-footer {
    color: #000 !important;
  }

  .meta-label,
  .section-title,
  .buyer-detail,
  .payment-label,
  .footer-contact,
  .receipt-subtitle,
  .item-sku,
  .total-row {
    color: #555 !important;
  }

  .meta-value,
  .buyer-name,
  .item-name,
  .total-row-final,
  .brand-name,
  .receipt-title {
    color: #000 !important;
  }

  .brand-accent {
    color: #1f7a4d !important;
  }

  .brand-mark {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .total-amount {
    color: #1f7a4d !important;
  }

  .status-badge {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .items-table th,
  .items-table td {
    color: #000 !important;
  }

  .items-table th {
    color: #555 !important;
  }

  .receipt-meta {
    border: 1px solid #e5e5e5 !important;
    border-radius: 8px !important;
    margin: 0 2rem;
    padding: 1rem 1.5rem !important;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .receipt-page {
    padding: 1rem 0.75rem 2rem;
  }

  .receipt-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.25rem 1.25rem;
  }

  .receipt-title-block {
    text-align: left;
  }

  .receipt-meta {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .receipt-section {
    padding: 1.25rem;
  }

  .receipt-footer {
    padding: 1.25rem;
  }

  .items-table {
    font-size: 0.82rem;
  }

  .col-price {
    display: none;
  }

  .topbar-actions {
    width: 100%;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }

  .totals-grid {
    max-width: none;
  }

  .payment-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .payment-label {
    min-width: auto;
    font-size: 0.78rem;
  }
}
</style>
