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
        <NuxtLink to="/products" class="nav-link">Store</NuxtLink>
        <NuxtLink to="/products?category=source-code" class="nav-link">Source Code</NuxtLink>
        <NuxtLink to="/products?category=ebooks" class="nav-link">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=services" class="nav-link">Services</NuxtLink>
      </nav>

      <!-- Actions -->
      <div class="actions">
        <button type="button" class="icon-btn" aria-label="Cari produk (Ctrl+K)" @click="openSearch">
          <AppIcon name="search" :size="20" />
        </button>
        <button class="icon-btn" aria-label="Akun" type="button">
          <AppIcon name="user" :size="20" />
        </button>
        <NuxtLink to="/checkout" class="icon-btn cart-btn" aria-label="Keranjang belanja">
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
        <NuxtLink to="/products" class="nav-mobile-link" @click="closeMenu">Store</NuxtLink>
        <NuxtLink to="/products?category=source-code" class="nav-mobile-link" @click="closeMenu">Source Code</NuxtLink>
        <NuxtLink to="/products?category=ebooks" class="nav-mobile-link" @click="closeMenu">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=services" class="nav-mobile-link" @click="closeMenu">Services</NuxtLink>
      </nav>
    </transition>
  </header>

  <!-- Search Command Palette -->
  <SearchCommand ref="searchRef" />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useCart } from '~/composables/useCart'
import { useTheme } from '~/composables/useTheme'
import SearchCommand from '~/components/SearchCommand.vue'

const searchRef = ref<InstanceType<typeof SearchCommand> | null>(null)

function openSearch() {
  searchRef.value?.open()
}

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
.nav-link.router-link-active {
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
}
</style>
