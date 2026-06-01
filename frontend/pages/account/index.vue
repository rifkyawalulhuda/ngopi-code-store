<template>
  <div class="account-page">
    <TheHeader />

    <div class="account-shell" :class="{ 'sidebar-collapsed': collapsed }">
      <!-- Mobile backdrop -->
      <transition name="backdrop">
        <div
          v-if="mobileOpen"
          class="sidebar-backdrop"
          aria-hidden="true"
          @click="mobileOpen = false"
        />
      </transition>

      <!-- Sidebar -->
      <aside
        class="account-sidebar"
        :class="{ 'mobile-open': mobileOpen }"
        aria-label="Menu akun"
      >
        <!-- Sidebar header: profile + collapse toggle -->
        <div class="sidebar-top">
          <div class="profile-card" :class="{ compact: collapsed }">
            <div class="profile-avatar">{{ initials }}</div>
            <div v-if="!collapsed" class="profile-info">
              <span class="profile-name">{{ fullName || 'Pengguna' }}</span>
              <span class="profile-email">{{ customer?.emailAddress || '—' }}</span>
            </div>
          </div>
          <button
            type="button"
            class="collapse-btn"
            :aria-label="collapsed ? 'Buka sidebar' : 'Tutup sidebar'"
            :aria-expanded="!collapsed"
            @click="toggleCollapse"
          >
            <AppIcon :name="collapsed ? 'arrowRight' : 'close'" :size="18" />
          </button>
        </div>

        <!-- Nav -->
        <nav class="side-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="side-nav-item"
            :class="{ active: activeTab === tab.id }"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            :title="collapsed ? tab.label : undefined"
            @click="selectTab(tab.id)"
          >
            <AppIcon :name="tab.icon" :size="20" />
            <span v-if="!collapsed" class="side-nav-label">{{ tab.label }}</span>
          </button>
        </nav>

        <!-- Footer: logout -->
        <div class="sidebar-bottom">
          <button
            type="button"
            class="side-nav-item logout"
            :title="collapsed ? 'Keluar' : undefined"
            @click="onLogout"
          >
            <AppIcon name="lock" :size="20" />
            <span v-if="!collapsed" class="side-nav-label">Keluar</span>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="account-content">
        <!-- Topbar (mobile menu trigger + page title) -->
        <div class="content-topbar">
          <button
            type="button"
            class="menu-trigger"
            aria-label="Buka menu akun"
            @click="mobileOpen = true"
          >
            <AppIcon name="menu" :size="20" />
          </button>
          <h1 class="content-title">{{ currentTabLabel }}</h1>
        </div>

        <!-- Welcome banner -->
        <section class="welcome">
          <div>
            <h2 class="welcome-title">
              Selamat datang kembali<span v-if="firstName">, {{ firstName }}</span>.
            </h2>
            <p class="welcome-sub">
              Kelola pustaka digital, riwayat pesanan, dan akun kamu di satu tempat.
            </p>
          </div>
          <NuxtLink to="/products" class="btn btn-primary">
            <AppIcon name="shoppingBag" :size="18" />
            Jelajahi Produk
          </NuxtLink>
        </section>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-label">Total Pesanan</span>
            <span class="stat-value">{{ orders.length }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Produk Dimiliki</span>
            <span class="stat-value">{{ totalProducts }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Status Akun</span>
            <span class="stat-badge">Terverifikasi</span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="content-state">
          <div class="content-spinner" />
          <p>Memuat data akun...</p>
        </div>

        <!-- Library tab -->
        <section v-else-if="activeTab === 'library'" class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Pustaka Digital Saya</h2>
            <NuxtLink to="/products" class="panel-link">Lihat Katalog</NuxtLink>
          </div>

          <div v-if="ownedProducts.length" class="library-grid">
            <article v-for="item in ownedProducts" :key="item.key" class="library-card">
              <div class="library-thumb">
                <img v-if="item.image" :src="item.image" :alt="item.name" loading="lazy" />
                <AppIcon v-else name="code" :size="28" />
              </div>
              <div class="library-body">
                <h3 class="library-name">{{ item.name }}</h3>
                <span class="library-meta">Pesanan {{ item.orderCode }}</span>
              </div>
              <NuxtLink
                :to="`/downloads/${item.orderCode}`"
                class="btn btn-soft btn-block"
                :aria-label="`Unduh ${item.name}`"
              >
                <AppIcon name="download" :size="16" />
                Unduh
              </NuxtLink>
            </article>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon"><AppIcon name="package" :size="28" /></div>
            <h3>Belum ada produk</h3>
            <p>Kamu belum membeli produk digital apa pun. Mulai jelajahi katalog kami.</p>
            <NuxtLink to="/products" class="btn btn-primary">Jelajahi Produk</NuxtLink>
          </div>
        </section>

        <!-- Orders tab -->
        <section v-else-if="activeTab === 'orders'" class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Riwayat Pesanan</h2>
          </div>

          <div v-if="orders.length" class="orders-list">
            <article v-for="order in orders" :key="order.id" class="order-row">
              <div class="order-main">
                <span class="order-code">{{ order.code }}</span>
                <span class="order-date">{{ formatDate(order.orderPlacedAt) }}</span>
              </div>
              <div class="order-meta">
                <span class="order-status" :class="statusClass(order.state)">{{ statusLabel(order.state) }}</span>
                <span class="order-total">{{ formatPriceIDR(order.totalWithTax) }}</span>
              </div>
              <NuxtLink :to="`/order/${order.code}`" class="order-link" aria-label="Lihat detail pesanan">
                <AppIcon name="arrowRight" :size="18" />
              </NuxtLink>
            </article>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon"><AppIcon name="cart" :size="28" /></div>
            <h3>Belum ada pesanan</h3>
            <p>Riwayat pesanan kamu akan muncul di sini setelah pembelian pertama.</p>
            <NuxtLink to="/products" class="btn btn-primary">Mulai Belanja</NuxtLink>
          </div>
        </section>

        <!-- Settings tab -->
        <section v-else class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Pengaturan Akun</h2>
          </div>

          <div class="settings-list">
            <div class="setting-row">
              <span class="setting-label">Nama Lengkap</span>
              <span class="setting-value">{{ fullName || '—' }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Email</span>
              <span class="setting-value">{{ customer?.emailAddress || '—' }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Status Verifikasi</span>
              <span class="setting-value"><span class="stat-badge">Terverifikasi</span></span>
            </div>
          </div>

          <p class="settings-note">
            Fitur pengubahan profil dan password akan segera tersedia.
          </p>
        </section>
      </main>
    </div>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { GET_ACTIVE_CUSTOMER_ORDERS } from '~/graphql/mutations/auth'
import { formatPriceIDR } from '~/utils/format'

useHead({
  title: 'Akun Saya - NgopiCode',
})

interface OrderLine {
  id: string
  quantity: number
  productVariant: { id: string; name: string }
  featuredAsset?: { preview: string } | null
}
interface CustomerOrder {
  id: string
  code: string
  state: string
  orderPlacedAt: string | null
  totalWithTax: number
  currencyCode: string
  lines: OrderLine[]
}

const { customer, logout, ensureSession } = useAuth()

type TabId = 'library' | 'orders' | 'settings'
const activeTab = ref<TabId>('library')
const loading = ref(true)
const orders = ref<CustomerOrder[]>([])

// Sidebar state — collapse persisted in a cookie (SSR-safe), mobile drawer is ephemeral
const collapsed = useCookie<boolean>('account_sidebar_collapsed', { default: () => false })
const mobileOpen = ref(false)

const tabs = [
  { id: 'library' as const, label: 'Pustaka Saya', icon: 'package' },
  { id: 'orders' as const, label: 'Riwayat Pesanan', icon: 'cart' },
  { id: 'settings' as const, label: 'Pengaturan', icon: 'user' },
]

const currentTabLabel = computed(() => tabs.find((t) => t.id === activeTab.value)?.label || 'Akun')

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function selectTab(id: TabId) {
  activeTab.value = id
  mobileOpen.value = false // close drawer after selecting on mobile
}

const firstName = computed(() => customer.value?.firstName || '')
const fullName = computed(() => {
  if (!customer.value) return ''
  return `${customer.value.firstName} ${customer.value.lastName}`.trim()
})
const initials = computed(() => {
  const f = customer.value?.firstName?.[0] || ''
  const l = customer.value?.lastName?.[0] || ''
  return (f + l).toUpperCase() || 'U'
})

const paidOrders = computed(() =>
  orders.value.filter((o) => ['PaymentSettled', 'Fulfilled', 'Delivered'].includes(o.state)),
)

const totalProducts = computed(() =>
  paidOrders.value.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.quantity, 0), 0),
)

const ownedProducts = computed(() => {
  const items: Array<{ key: string; name: string; image: string | null; orderCode: string }> = []
  for (const order of paidOrders.value) {
    for (const line of order.lines) {
      items.push({
        key: `${order.id}-${line.id}`,
        name: line.productVariant.name,
        image: line.featuredAsset?.preview || null,
        orderCode: order.code,
      })
    }
  }
  return items
})

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(state: string): string {
  const map: Record<string, string> = {
    PaymentSettled: 'Lunas',
    Fulfilled: 'Selesai',
    Delivered: 'Terkirim',
    ArrangingPayment: 'Menunggu Bayar',
    AddingItems: 'Keranjang',
    Cancelled: 'Dibatalkan',
  }
  return map[state] || state
}

function statusClass(state: string): string {
  if (['PaymentSettled', 'Fulfilled', 'Delivered'].includes(state)) return 'status-success'
  if (['ArrangingPayment', 'AddingItems'].includes(state)) return 'status-pending'
  if (state === 'Cancelled') return 'status-danger'
  return ''
}

async function onLogout() {
  await logout()
  navigateTo('/auth')
}

// Lock body scroll when mobile drawer is open
watch(mobileOpen, (open) => {
  if (import.meta.client) {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})

onMounted(async () => {
  loading.value = true
  try {
    const activeCustomer = await ensureSession()
    if (!activeCustomer) {
      navigateTo('/auth')
      return
    }

    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({
      query: GET_ACTIVE_CUSTOMER_ORDERS,
      fetchPolicy: 'network-only',
    })

    if (!data?.activeCustomer) {
      navigateTo('/auth')
      return
    }

    orders.value = data.activeCustomer.orders?.items || []
  } catch {
    navigateTo('/auth')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.account-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

/* Shell: sidebar + content */
.account-shell {
  flex: 1;
  display: grid;
  grid-template-columns: 264px 1fr;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  gap: 1.5rem;
  padding: 1.5rem 1.25rem 3rem;
  transition: grid-template-columns 0.25s ease;
}

.account-shell.sidebar-collapsed {
  grid-template-columns: 76px 1fr;
}

/* Sidebar */
.account-sidebar {
  position: sticky;
  top: 88px;
  align-self: start;
  height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 0.85rem;
  overflow: hidden;
}

.sidebar-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.85rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex: 1;
  min-width: 0;
}

.profile-card.compact {
  justify-content: center;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: var(--primary-contrast);
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-name {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-email {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.collapse-btn:hover {
  background: var(--btn-ghost-hover);
  color: var(--primary-text);
}

.sidebar-collapsed .sidebar-top {
  flex-direction: column;
  gap: 0.6rem;
}

/* Nav */
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow-y: auto;
}

.sidebar-bottom {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.side-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.7rem 0.8rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.92rem;
  font-weight: 500;
  font-family: inherit;
  border-radius: 9px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.sidebar-collapsed .side-nav-item {
  justify-content: center;
  padding: 0.7rem;
}

.side-nav-item:hover {
  background: var(--surface-2);
  color: var(--text);
}

.side-nav-item.active {
  background: var(--primary-soft);
  color: var(--primary-text);
  font-weight: 600;
}

.side-nav-item.logout {
  color: #b91c1c;
}

.side-nav-item.logout:hover {
  background: #fef2f2;
}

[data-theme='dark'] .side-nav-item.logout {
  color: #fca5a5;
}

[data-theme='dark'] .side-nav-item.logout:hover {
  background: rgba(185, 28, 28, 0.12);
}

/* Content */
.account-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

.content-topbar {
  display: none;
  align-items: center;
  gap: 0.75rem;
}

.menu-trigger {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 10px;
  cursor: pointer;
}

.content-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

/* Welcome banner */
.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.welcome-title {
  font-size: clamp(1.3rem, 2.5vw, 1.7rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}

.welcome-sub {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.92rem;
  max-width: 520px;
  line-height: 1.5;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.stat-label {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stat-badge {
  align-self: flex-start;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-text);
}

/* Panel */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.panel-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.panel-link {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--primary-text);
  text-decoration: none;
}

.panel-link:hover {
  text-decoration: underline;
}

/* Library grid */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.library-card {
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  transition: transform 0.18s, box-shadow 0.18s;
}

.library-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px var(--shadow-card-strong);
}

.library-thumb {
  aspect-ratio: 16 / 10;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  color: var(--placeholder-icon);
  border-bottom: 1px solid var(--border);
}

.library-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-body {
  padding: 0.85rem 0.9rem 0.5rem;
  flex: 1;
}

.library-name {
  font-size: 0.92rem;
  font-weight: 600;
  margin: 0 0 0.3rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.library-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* Orders list */
.orders-list {
  display: flex;
  flex-direction: column;
}

.order-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.order-row:last-child {
  border-bottom: none;
}

.order-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.order-code {
  font-weight: 700;
  font-size: 0.92rem;
  font-variant-numeric: tabular-nums;
}

.order-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.order-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.order-status {
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
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
  background: rgba(146, 64, 14, 0.2);
  color: #fcd34d;
}

[data-theme='dark'] .status-danger {
  background: rgba(185, 28, 28, 0.15);
  color: #fca5a5;
}

.order-total {
  font-weight: 700;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.order-link {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  color: var(--text-muted);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.order-link:hover {
  background: var(--surface-2);
  color: var(--primary-text);
}

/* Settings */
.settings-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.setting-value {
  font-size: 0.92rem;
  font-weight: 600;
}

.settings-note {
  margin: 1rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-muted);
  margin: 0 auto 1rem;
}

.empty-state h3 {
  margin: 0 0 0.4rem;
  font-size: 1.1rem;
}

.empty-state p {
  color: var(--text-muted);
  margin: 0 0 1.25rem;
  font-size: 0.92rem;
}

/* Content loading */
.content-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
}

.content-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-strong);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.25rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.18s, transform 0.15s;
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-soft {
  background: var(--surface-2);
  color: var(--primary-text);
  border-color: var(--border);
  margin: 0 0.9rem 0.9rem;
}

.btn-soft:hover {
  background: var(--btn-ghost-hover);
}

.btn-block {
  width: calc(100% - 1.8rem);
}

/* Backdrop (mobile) */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.22s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

/* Responsive: tablet collapses sidebar to icons automatically */
@media (max-width: 1024px) and (min-width: 861px) {
  .account-shell {
    grid-template-columns: 76px 1fr;
  }
  .account-shell .profile-info,
  .account-shell .side-nav-label {
    display: none;
  }
  .account-shell .side-nav-item {
    justify-content: center;
    padding: 0.7rem;
  }
}

/* Mobile: sidebar becomes an off-canvas drawer */
@media (max-width: 860px) {
  .account-shell {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 1rem 1rem 2.5rem;
  }

  .content-topbar {
    display: flex;
  }

  .account-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    height: 100vh;
    width: 280px;
    border-radius: 0;
    z-index: 70;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .account-sidebar.mobile-open {
    transform: translateX(0);
  }

  /* On mobile the drawer is always full (never icon-only) */
  .sidebar-collapsed .profile-info,
  .sidebar-collapsed .side-nav-label {
    display: flex;
  }
  .sidebar-collapsed .side-nav-item {
    justify-content: flex-start;
    padding: 0.7rem 0.8rem;
  }
  .sidebar-collapsed .sidebar-top {
    flex-direction: row;
  }

  /* Hide the collapse toggle on mobile (drawer uses backdrop/menu instead) */
  .collapse-btn {
    display: none;
  }
}

@media (max-width: 560px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .welcome {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .account-shell,
  .account-sidebar,
  .content-spinner,
  .library-card,
  .backdrop-enter-active,
  .backdrop-leave-active {
    transition: none;
    animation: none;
  }
}
</style>
