<template>
  <header class="site-header">
    <div class="header-inner">
      <!-- Brand -->
      <NuxtLink to="/" class="brand" @click="closeMenu">
        <span class="brand-mark">
          <AppIcon name="terminal" :size="20" />
        </span>
        <span class="brand-name">Ngopi<span class="brand-accent">Code</span></span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="nav-desktop" aria-label="Navigasi utama">
        <NuxtLink to="/products" class="nav-link">Store</NuxtLink>
        <NuxtLink to="/products?category=source-code" class="nav-link">Source Code</NuxtLink>
        <NuxtLink to="/products?category=ebooks" class="nav-link">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=services" class="nav-link">Services</NuxtLink>
      </nav>

      <!-- Actions -->
      <div class="actions">
        <NuxtLink to="/products" class="icon-btn" aria-label="Cari produk">
          <AppIcon name="search" :size="20" />
        </NuxtLink>
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

    <!-- Mobile nav -->
    <transition name="slide">
      <nav v-if="menuOpen" class="nav-mobile" aria-label="Navigasi seluler">
        <NuxtLink to="/products" class="nav-mobile-link" @click="closeMenu">Store</NuxtLink>
        <NuxtLink to="/products?category=source-code" class="nav-mobile-link" @click="closeMenu">Source Code</NuxtLink>
        <NuxtLink to="/products?category=ebooks" class="nav-mobile-link" @click="closeMenu">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=services" class="nav-mobile-link" @click="closeMenu">Services</NuxtLink>
      </nav>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCart } from '~/composables/useCart'

const { cartItemCount } = useCart()

const menuOpen = ref(false)
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e8ece9;
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
  color: #14241b;
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #1f7a4d;
  color: #fff;
}

.brand-accent {
  color: #1f7a4d;
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.nav-link {
  text-decoration: none;
  color: #45554c;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.18s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #1f7a4d;
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
  color: #2d3b33;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.18s, color 0.18s;
}

.icon-btn:hover {
  background: #eef4f0;
  color: #1f7a4d;
}

.cart-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #1f7a4d;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.menu-toggle {
  display: none;
}

.nav-mobile {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 1.25rem 1rem;
  border-top: 1px solid #e8ece9;
  background: #fff;
}

.nav-mobile-link {
  padding: 0.85rem 0.25rem;
  text-decoration: none;
  color: #2d3b33;
  font-weight: 500;
  border-bottom: 1px solid #f0f3f1;
}

.nav-mobile-link:last-child {
  border-bottom: none;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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
