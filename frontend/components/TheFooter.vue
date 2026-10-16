<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <NuxtLink to="/" class="brand">
          <span class="brand-mark"><AppIcon name="terminal" :size="20" /></span>
          <span class="brand-name">Ngopi<span class="brand-accent">Code</span></span>
        </NuxtLink>
        <p class="footer-tagline">
          Source Code, Template, Ebook, Jasa Install Website
        </p>
        <div class="footer-socials">
          <a
            v-if="whatsappLink"
            :href="whatsappLink"
            class="social"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Hubungi via WhatsApp"
            title="Chat WhatsApp"
          >
            <AppIcon name="whatsapp" :size="18" />
          </a>
          <a
            v-if="githubLink"
            :href="githubLink"
            class="social"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
          >
            <AppIcon name="github" :size="18" />
          </a>
          <a
            v-if="ownerEmail"
            :href="`mailto:${ownerEmail}`"
            class="social"
            aria-label="Email"
            title="Email"
          >
            <AppIcon name="mail" :size="18" />
          </a>
        </div>
      </div>

      <nav class="footer-col" aria-labelledby="footer-explore">
        <h2 id="footer-explore">Jelajahi</h2>
        <ul>
          <li><NuxtLink to="/products">Katalog</NuxtLink></li>
          <li><NuxtLink to="/order/lookup">Cek Pesanan</NuxtLink></li>
          <li>
            <a href="https://ngopidulur.my.id/blog/" target="_blank" rel="noopener noreferrer">Blog</a>
          </li>
        </ul>
      </nav>

      <nav class="footer-col" aria-labelledby="footer-support">
        <h2 id="footer-support">Bantuan</h2>
        <ul>
          <li><NuxtLink to="/tentang">Tentang Kami</NuxtLink></li>
          <li><NuxtLink to="/kontak">Kontak</NuxtLink></li>
        </ul>
      </nav>

      <nav class="footer-col" aria-labelledby="footer-legal">
        <h2 id="footer-legal">Legal</h2>
        <ul>
          <li><NuxtLink to="/kebijakan-privasi">Kebijakan Privasi</NuxtLink></li>
          <li><NuxtLink to="/syarat-ketentuan">Syarat &amp; Ketentuan</NuxtLink></li>
        </ul>
      </nav>
    </div>

    <div class="footer-bottom">
      <div class="footer-bottom-inner">
        <p>© {{ year }} Ngopi Code Digital Assets. Hak cipta dilindungi.</p>
        <button class="to-top" type="button" aria-label="Kembali ke atas" @click="scrollToTop">
          <AppIcon name="arrowUp" :size="16" />
          <span>Ke atas</span>
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWhatsapp } from '~/composables/useWhatsapp'

const year = new Date().getFullYear()

const { whatsappNumber, githubLink, ownerEmail, fetchWhatsappNumber } = useWhatsapp()

// Direct WhatsApp link to the owner (general inquiry, no specific product)
const whatsappLink = computed(() => {
  if (!whatsappNumber.value) return ''
  const cleanNumber = whatsappNumber.value.replace(/\D/g, '')
  const message = encodeURIComponent('Halo NgopiCode, saya ingin bertanya.')
  return `https://wa.me/${cleanNumber}?text=${message}`
})

function scrollToTop() {
  if (!import.meta.client) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(() => {
  fetchWhatsappNumber()
})
</script>

<style scoped>
.site-footer {
  background: var(--footer-bg);
  color: var(--footer-text);
  margin-top: 4rem;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3.5rem 1.25rem 2.5rem;
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 2.5rem 2rem;
}

.footer-brand {
  max-width: 360px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  /* Keeps the tap target at the 44px minimum */
  min-height: 44px;
  text-decoration: none;
  color: var(--footer-heading);
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
  border-radius: 8px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary);
  color: var(--primary-contrast);
}

.brand-accent {
  color: var(--footer-accent);
}

.footer-tagline {
  margin: 1rem 0 1.5rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--footer-muted);
}

.footer-socials {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.social {
  display: grid;
  place-items: center;
  /* 44px meets the minimum touch target size */
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--footer-chip);
  color: var(--footer-text);
  transition: background 0.18s, color 0.18s, transform 0.18s;
}

.social:hover {
  background: var(--footer-accent);
  color: var(--footer-bg);
  transform: translateY(-2px);
}

/* Visible focus rings for keyboard users */
.brand:focus-visible,
.social:focus-visible,
.footer-col a:focus-visible,
.to-top:focus-visible {
  outline: 2px solid var(--footer-accent);
  outline-offset: 2px;
}

.footer-col h2 {
  color: var(--footer-heading);
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  letter-spacing: 0.01em;
}

.footer-col ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.footer-col a {
  display: inline-flex;
  align-items: center;
  /* 44px meets the minimum touch target size */
  min-height: 44px;
  color: var(--footer-muted);
  text-decoration: none;
  font-size: 0.9rem;
  border-radius: 6px;
  transition: color 0.18s;
}

.footer-col a:hover {
  color: var(--footer-accent);
}

.footer-bottom {
  border-top: 1px solid var(--footer-border);
}

.footer-bottom-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-bottom p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--footer-muted);
}

.to-top {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  /* 44px meets the minimum touch target size */
  min-height: 44px;
  padding: 0 0.9rem;
  border: 1px solid var(--footer-border);
  border-radius: 10px;
  background: transparent;
  color: var(--footer-text);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}

.to-top:hover {
  background: var(--footer-chip);
  border-color: var(--footer-accent);
  color: var(--footer-accent);
}

@media (prefers-reduced-motion: reduce) {
  .social,
  .footer-col a,
  .to-top {
    transition: none;
  }
  .social:hover {
    transform: none;
  }
}

@media (max-width: 860px) {
  .footer-inner {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem 1.5rem;
  }
  .footer-brand {
    grid-column: 1 / -1;
    max-width: none;
  }
}

@media (max-width: 560px) {
  .footer-inner {
    grid-template-columns: repeat(2, 1fr);
    padding: 2.5rem 1.25rem 2rem;
  }
  .footer-bottom-inner {
    justify-content: center;
    text-align: center;
  }
}
</style>
