<template>
  <header class="site-header">
    <div class="header-inner">
      <!-- Brand + Theme toggle -->
      <div class="brand-group">
        <NuxtLink to="/" class="brand" @click="closeMenu">
          <span class="brand-mark">
            <AppIcon name="terminal" :size="20" />
          </span>
          <span class="brand-name">Ngopi<span class="brand-accent">Code</span></span>
        </NuxtLink>
        <ClientOnly>
          <button
            class="theme-toggle"
            type="button"
            :aria-label="isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
            :title="isDark ? 'Mode terang' : 'Mode gelap'"
            @click="toggleTheme"
          >
            <AppIcon :name="isDark ? 'sun' : 'moon'" :size="16" />
          </button>
          <template #fallback>
            <button class="theme-toggle" type="button" aria-label="Ganti tema">
              <AppIcon name="moon" :size="16" />
            </button>
          </template>
        </ClientOnly>
      </div>

      <!-- Desktop nav -->
      <nav class="nav-desktop" aria-label="Navigasi utama">
        <NuxtLink to="/" class="nav-link" active-class="nav-link-noop" exact-active-class="nav-active">Home</NuxtLink>
        <NuxtLink to="/products" class="nav-link" :class="{ 'nav-active': activeCategory === 'all' }">Katalog</NuxtLink>
        <NuxtLink to="/products?category=ebooks" class="nav-link" :class="{ 'nav-active': activeCategory === 'ebooks' }">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=services" class="nav-link" :class="{ 'nav-active': activeCategory === 'services' }">Services</NuxtLink>
      </nav>

      <!-- Actions -->
      <div class="actions">
        <button type="button" class="icon-btn" aria-label="Cari produk (Ctrl+K)" @click="openSearch">
          <AppIcon name="search" :size="20" />
        </button>
        <NuxtLink
          :to="accountLink"
          class="icon-btn hide-mobile"
          :class="{ active: isAccountActive }"
          :aria-label="isLoggedIn ? 'Akun saya' : 'Masuk'"
          :aria-current="isAccountActive ? 'page' : undefined"
        >
          <AppIcon name="user" :size="20" />
          <span v-if="hasPendingOrders && isLoggedIn" class="user-badge" :aria-label="`${pendingOrderCount} pesanan menunggu pembayaran`">{{ pendingOrderCount }}</span>
        </NuxtLink>
        <NuxtLink to="/checkout" class="icon-btn cart-btn hide-mobile" aria-label="Keranjang belanja">
          <AppIcon name="cart" :size="20" />
          <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
        </NuxtLink>
        <button
          class="icon-btn menu-toggle"
          :aria-expanded="menuOpen"
          aria-label="Buka menu"
          type="button"
          @click="toggleMenu"
        >
          <AppIcon :name="menuOpen ? 'close' : 'menu'" :size="22" />
          <span v-if="hasPendingOrders && isLoggedIn" class="user-badge" :aria-label="`${pendingOrderCount} pesanan menunggu pembayaran`">{{ pendingOrderCount }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile nav overlay (does not push page content) -->
    <transition name="backdrop">
      <div
        v-if="menuOpen"
        class="nav-backdrop"
        aria-hidden="true"
        @click="closeMenu"
      />
    </transition>
    <transition name="drawer">
      <nav v-if="menuOpen" class="nav-mobile" aria-label="Navigasi seluler">
        <!-- User actions (profile + cart) at top in mobile menu -->
        <div class="nav-mobile-user-actions">
          <NuxtLink :to="accountLink" class="nav-mobile-action" @click="closeMenu">
            <AppIcon name="user" :size="20" />
            <span>{{ isLoggedIn ? 'Akun Saya' : 'Masuk' }}</span>
            <span v-if="hasPendingOrders && isLoggedIn" class="nav-mobile-badge">{{ pendingOrderCount }}</span>
          </NuxtLink>
          <NuxtLink to="/checkout" class="nav-mobile-action" @click="closeMenu">
            <AppIcon name="cart" :size="20" />
            <span>Keranjang</span>
            <span v-if="cartItemCount > 0" class="nav-mobile-badge">{{ cartItemCount }}</span>
          </NuxtLink>
        </div>

        <div class="nav-mobile-divider" />

        <NuxtLink to="/" class="nav-mobile-link" @click="closeMenu">Home</NuxtLink>
        <NuxtLink to="/products" class="nav-mobile-link" :class="{ 'nav-active': activeCategory === 'all' }" @click="closeMenu">Katalog</NuxtLink>
        <NuxtLink to="/products?category=ebooks" class="nav-mobile-link" :class="{ 'nav-active': activeCategory === 'ebooks' }" @click="closeMenu">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=services" class="nav-mobile-link" :class="{ 'nav-active': activeCategory === 'services' }" @click="closeMenu">Services</NuxtLink>
      </nav>
    </transition>
  </header>

  <!-- Search Command Palette -->
  <SearchCommand ref="searchRef" />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed, onMounted } from 'vue'
import { useCart } from '~/composables/useCart'
import { useTheme } from '~/composables/useTheme'
import { useAuth } from '~/composables/useAuth'
import SearchCommand from '~/components/SearchCommand.vue'

const searchRef = ref<InstanceType<typeof SearchCommand> | null>(null)

function openSearch() {
  searchRef.value?.open()
}

const { isLoggedIn, ensureSession } = useAuth()
const { hasPending: hasPendingOrders, count: pendingOrderCount } = usePendingOrders()
const accountLink = computed(() => (isLoggedIn.value ? '/account' : '/auth'))
// Highlight the profile button while on the account page
const currentRoute = useRoute()
const isAccountActive = computed(() => currentRoute.path.startsWith('/account'))

// Active nav category for the catalog links (query-param aware).
// On /products: category query value, or 'all' when no category is set.
const activeCategory = computed(() => {
  if (!currentRoute.path.startsWith('/products')) return ''
  const cat = currentRoute.query.category as string | undefined
  return cat || 'all'
})

// Check session once on mount so the user icon points to the right place
onMounted(async () => {
  await ensureSession()
  // Check for pending orders to show notification badge
  if (isLoggedIn.value) {
    const { checkPendingOrders } = usePendingOrders()
    checkPendingOrders()
  }
})

const { cartItemCount } = useCart()
const { isDark, toggleTheme } = useTheme()

const menuOpen = ref(false)

function lockScroll(lock: boolean) {
  if (!import.meta.client) return
  document.body.style.overflow = lock ? 'hidden' : ''
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

// Lock background scroll while the mobile menu is open.
watch(menuOpen, (open) => lockScroll(open))

// Close the menu whenever navigation occurs.
const route = useRoute()
watch(
  () => route.fullPath,
  () => closeMenu(),
)

// Close on Escape key for accessibility.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}
if (import.meta.client) {
  window.addEventListener('keydown', onKeydown)
}

onBeforeUnmount(() => {
  lockScroll(false)
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.25rem;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--text);
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.theme-toggle {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}

.theme-toggle:hover {
  background: var(--btn-ghost-hover);
  color: var(--primary-text);
  border-color: var(--primary-text);
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

.brand-accent {
  color: var(--primary-text);
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.18s;
}

.nav-link:hover,
.nav-link.nav-active {
  color: var(--primary-text);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.icon-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text);
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.18s, color 0.18s;
}

.icon-btn:hover {
  background: var(--surface-2);
  color: var(--primary-text);
}

.icon-btn.active {
  background: var(--primary-soft);
  color: var(--primary-text);
}

.cart-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.user-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

@keyframes user-badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (prefers-reduced-motion: reduce) {
  .user-badge { animation: none; }
}

.menu-toggle {
  display: none;
}

/* Backdrop behind the mobile menu */
.nav-backdrop {
  position: fixed;
  inset: 0;
  top: 68px;
  z-index: 40;
  background: rgba(0, 0, 0, 0.4);
}

.nav-mobile {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 45;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 1.25rem 1rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 16px 32px var(--shadow-card-strong);
}

.nav-mobile-link {
  padding: 0.95rem 0.25rem;
  text-decoration: none;
  color: var(--text);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}

.nav-mobile-link:last-child {
  border-bottom: none;
}

.nav-mobile-link.nav-active {
  color: var(--primary-text);
  font-weight: 600;
}

/* Drawer slide-down animation */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* Backdrop fade animation */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.22s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .nav-desktop {
    display: none;
  }
  .menu-toggle {
    display: grid;
  }
  /* Hide profile & cart in header on mobile — moved into drawer */
  .hide-mobile {
    display: none !important;
  }
}

/* Mobile menu user actions */
.nav-mobile-user-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0 0 0.25rem;
}

.nav-mobile-action {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  position: relative;
  transition: background 0.15s, border-color 0.15s;
}

.nav-mobile-action:hover {
  background: var(--primary-soft);
  border-color: var(--primary);
}

.nav-mobile-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.nav-mobile-divider {
  height: 1px;
  background: var(--border);
  margin: 0.5rem 0;
}
</style>
