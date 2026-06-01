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
        <div class="stats-row" :class="{ 'mobile-hidden': activeTab !== 'library' }">
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

          <div class="accordion">
            <!-- Profile section -->
            <div class="accordion-item" :class="{ open: openSection === 'profile' }">
              <button
                type="button"
                class="accordion-header"
                :aria-expanded="openSection === 'profile'"
                aria-controls="acc-profile"
                @click="toggleSection('profile')"
              >
                <span class="accordion-head-text">
                  <span class="accordion-icon"><AppIcon name="user" :size="18" /></span>
                  <span>
                    <span class="accordion-title">Profil</span>
                    <span class="accordion-sub">Nama dan nomor WhatsApp</span>
                  </span>
                </span>
                <AppIcon name="chevronDown" :size="18" class="accordion-chevron" />
              </button>

              <div v-show="openSection === 'profile'" id="acc-profile" class="accordion-body">
                <form class="settings-form" @submit.prevent="onSaveProfile">
                  <div class="settings-grid">
                    <div class="form-group">
                      <label for="set-first" class="form-label">Nama Depan</label>
                      <input id="set-first" v-model="profileForm.firstName" type="text" class="form-input" autocomplete="given-name" />
                    </div>
                    <div class="form-group">
                      <label for="set-last" class="form-label">Nama Belakang</label>
                      <input id="set-last" v-model="profileForm.lastName" type="text" class="form-input" autocomplete="family-name" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="set-wa" class="form-label">Nomor WhatsApp <span class="optional">(opsional)</span></label>
                    <input
                      id="set-wa"
                      v-model="profileForm.whatsappNumber"
                      type="tel"
                      class="form-input"
                      placeholder="Contoh: 6281234567890"
                      inputmode="numeric"
                      autocomplete="tel"
                    />
                    <p class="form-help">Gunakan format internasional dengan kode negara (62 untuk Indonesia).</p>
                  </div>

                  <div v-if="profileMsg" class="form-feedback" :class="profileOk ? 'feedback-success' : 'feedback-error'" role="status">
                    {{ profileMsg }}
                  </div>

                  <button type="submit" class="btn btn-primary" :disabled="profileSaving">
                    <span v-if="profileSaving" class="btn-spinner-sm" />
                    <span v-else>Simpan Profil</span>
                  </button>
                </form>
              </div>
            </div>

            <!-- Email section -->
            <div class="accordion-item" :class="{ open: openSection === 'email' }">
              <button
                type="button"
                class="accordion-header"
                :aria-expanded="openSection === 'email'"
                aria-controls="acc-email"
                @click="toggleSection('email')"
              >
                <span class="accordion-head-text">
                  <span class="accordion-icon"><AppIcon name="mail" :size="18" /></span>
                  <span>
                    <span class="accordion-title">Ubah Email</span>
                    <span class="accordion-sub">{{ customer?.emailAddress }}</span>
                  </span>
                </span>
                <AppIcon name="chevronDown" :size="18" class="accordion-chevron" />
              </button>

              <div v-show="openSection === 'email'" id="acc-email" class="accordion-body">
                <form class="settings-form" @submit.prevent="onRequestEmailChange">
                  <p class="settings-desc">
                    Setelah mengirim permintaan, cek email <strong>baru</strong> kamu untuk verifikasi.
                    Email tidak akan berubah sampai kamu verifikasi.
                  </p>

                  <div class="form-group">
                    <label for="set-new-email" class="form-label">Email Baru</label>
                    <input id="set-new-email" v-model="emailForm.newEmail" type="email" class="form-input" placeholder="email-baru@email.com" autocomplete="email" />
                  </div>

                  <div class="form-group">
                    <label for="set-email-pw" class="form-label">Password Saat Ini</label>
                    <input id="set-email-pw" v-model="emailForm.password" type="password" class="form-input" placeholder="Konfirmasi dengan password" autocomplete="current-password" />
                  </div>

                  <div v-if="emailMsg" class="form-feedback" :class="emailOk ? 'feedback-success' : 'feedback-error'" role="status">
                    {{ emailMsg }}
                  </div>

                  <button type="submit" class="btn btn-primary" :disabled="emailSaving">
                    <span v-if="emailSaving" class="btn-spinner-sm" />
                    <span v-else>Kirim Verifikasi Email Baru</span>
                  </button>
                </form>
              </div>
            </div>

            <!-- Password section -->
            <div class="accordion-item" :class="{ open: openSection === 'password' }">
              <button
                type="button"
                class="accordion-header"
                :aria-expanded="openSection === 'password'"
                aria-controls="acc-password"
                @click="toggleSection('password')"
              >
                <span class="accordion-head-text">
                  <span class="accordion-icon"><AppIcon name="lock" :size="18" /></span>
                  <span>
                    <span class="accordion-title">Ubah Password</span>
                    <span class="accordion-sub">Ganti kata sandi akun</span>
                  </span>
                </span>
                <AppIcon name="chevronDown" :size="18" class="accordion-chevron" />
              </button>

              <div v-show="openSection === 'password'" id="acc-password" class="accordion-body">
                <form class="settings-form" @submit.prevent="onChangePassword">
                  <div class="form-group">
                    <label for="set-old-pw" class="form-label">Password Lama</label>
                    <input id="set-old-pw" v-model="passwordForm.current" type="password" class="form-input" placeholder="Password saat ini" autocomplete="current-password" />
                  </div>

                  <div class="settings-grid">
                    <div class="form-group">
                      <label for="set-new-pw" class="form-label">Password Baru</label>
                      <input id="set-new-pw" v-model="passwordForm.next" type="password" class="form-input" placeholder="Minimal 8 karakter" minlength="8" autocomplete="new-password" />
                    </div>
                    <div class="form-group">
                      <label for="set-new-pw2" class="form-label">Konfirmasi Password Baru</label>
                      <input
                        id="set-new-pw2"
                        v-model="passwordForm.confirm"
                        type="password"
                        class="form-input"
                        :class="{ 'input-error': pwMismatch }"
                        placeholder="Ulangi password baru"
                        minlength="8"
                        autocomplete="new-password"
                      />
                    </div>
                  </div>
                  <p v-if="pwMismatch" class="field-error" role="alert">Password baru tidak cocok.</p>

                  <div v-if="pwMsg" class="form-feedback" :class="pwOk ? 'feedback-success' : 'feedback-error'" role="status">
                    {{ pwMsg }}
                  </div>

                  <button type="submit" class="btn btn-primary" :disabled="pwSaving || pwMismatch">
                    <span v-if="pwSaving" class="btn-spinner-sm" />
                    <span v-else>Ganti Password</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
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

const { customer, logout, ensureSession, updateProfile, changePassword, requestEmailChange, error: authError } = useAuth()

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

/* ---------- Settings forms ---------- */

// Accordion: which section is open (only one at a time). Default: profile open.
type SettingsSection = 'profile' | 'email' | 'password'
const openSection = ref<SettingsSection>('profile')

function toggleSection(section: SettingsSection) {
  openSection.value = openSection.value === section ? ('' as SettingsSection) : section
}

// Profile (name + whatsapp)
const profileForm = reactive({ firstName: '', lastName: '', whatsappNumber: '' })
const profileSaving = ref(false)
const profileMsg = ref('')
const profileOk = ref(false)

// Email change
const emailForm = reactive({ newEmail: '', password: '' })
const emailSaving = ref(false)
const emailMsg = ref('')
const emailOk = ref(false)

// Password change
const passwordForm = reactive({ current: '', next: '', confirm: '' })
const pwSaving = ref(false)
const pwMsg = ref('')
const pwOk = ref(false)
const pwMismatch = computed(
  () => passwordForm.confirm.length > 0 && passwordForm.next !== passwordForm.confirm,
)

// Prefill profile form when customer data loads
watch(
  customer,
  (c) => {
    if (c) {
      profileForm.firstName = c.firstName || ''
      profileForm.lastName = c.lastName || ''
      profileForm.whatsappNumber = c.customFields?.whatsappNumber || ''
    }
  },
  { immediate: true },
)

async function onSaveProfile() {
  profileSaving.value = true
  profileMsg.value = ''
  try {
    const ok = await updateProfile({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      whatsappNumber: profileForm.whatsappNumber.trim() || null,
    })
    profileOk.value = ok
    profileMsg.value = ok ? 'Profil berhasil diperbarui.' : (authError.value || 'Gagal memperbarui profil.')
  } finally {
    profileSaving.value = false
  }
}

async function onRequestEmailChange() {
  if (!emailForm.newEmail || !emailForm.password) {
    emailOk.value = false
    emailMsg.value = 'Isi email baru dan password.'
    return
  }
  emailSaving.value = true
  emailMsg.value = ''
  try {
    const ok = await requestEmailChange(emailForm.password, emailForm.newEmail.trim())
    emailOk.value = ok
    if (ok) {
      emailMsg.value = `Link verifikasi telah dikirim ke ${emailForm.newEmail}. Email akan berubah setelah kamu verifikasi.`
      emailForm.newEmail = ''
      emailForm.password = ''
    } else {
      emailMsg.value = authError.value || 'Gagal meminta perubahan email.'
    }
  } finally {
    emailSaving.value = false
  }
}

async function onChangePassword() {
  if (passwordForm.next !== passwordForm.confirm) {
    pwOk.value = false
    pwMsg.value = 'Password baru tidak cocok.'
    return
  }
  if (!passwordForm.current || !passwordForm.next) {
    pwOk.value = false
    pwMsg.value = 'Isi password lama dan password baru.'
    return
  }
  pwSaving.value = true
  pwMsg.value = ''
  try {
    const ok = await changePassword(passwordForm.current, passwordForm.next)
    pwOk.value = ok
    if (ok) {
      pwMsg.value = 'Password berhasil diganti.'
      passwordForm.current = ''
      passwordForm.next = ''
      passwordForm.confirm = ''
    } else {
      pwMsg.value = authError.value || 'Gagal mengganti password.'
    }
  } finally {
    pwSaving.value = false
  }
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

/* Accordion */
.accordion {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.accordion-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
  transition: border-color 0.18s;
}

.accordion-item.open {
  border-color: var(--primary);
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.1rem;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.accordion-header:hover {
  background: var(--surface-2);
}

.accordion-head-text {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.accordion-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: var(--primary-soft);
  color: var(--primary-text);
  flex-shrink: 0;
}

.accordion-title {
  display: block;
  font-size: 0.98rem;
  font-weight: 700;
}

.accordion-sub {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
}

.accordion-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.accordion-item.open .accordion-chevron {
  transform: rotate(180deg);
}

.accordion-body {
  padding: 0.25rem 1.1rem 1.25rem;
  border-top: 1px solid var(--border);
}

/* Settings forms */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}

.settings-subtitle {
  font-size: 1.02rem;
  font-weight: 700;
  margin: 0;
}

.settings-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.settings-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.75rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.86rem;
  font-weight: 600;
}

.optional {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.form-input {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.92rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.form-input::placeholder {
  color: var(--placeholder-icon);
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.form-input.input-error {
  border-color: #dc2626;
}

.form-help {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.field-error {
  font-size: 0.82rem;
  color: #dc2626;
  margin: 0;
}

[data-theme='dark'] .field-error {
  color: #fca5a5;
}

.form-feedback {
  padding: 0.7rem 0.9rem;
  border-radius: 9px;
  font-size: 0.86rem;
  line-height: 1.5;
}

.feedback-success {
  background: var(--primary-soft);
  color: var(--primary-text);
}

.feedback-error {
  background: #fef2f2;
  color: #b91c1c;
}

[data-theme='dark'] .feedback-error {
  background: rgba(185, 28, 28, 0.12);
  color: #fca5a5;
}

.btn-spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.settings-form .btn {
  align-self: flex-start;
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
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

/* On mobile, show stats only on the Library (home) tab */
@media (max-width: 860px) {
  .stats-row.mobile-hidden {
    display: none;
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
