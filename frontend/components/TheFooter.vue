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

    </div>

    <div class="footer-bottom">
      <p>© {{ year }} Ngopi Code Digital Assets. Hak cipta dilindungi.</p>
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

onMounted(() => {
  fetchWhatsappNumber()
})
</script>

<style scoped>
.site-footer {
  background: #11201a;
  color: #c8d4cd;
  margin-top: 4rem;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3.5rem 1.25rem 2.5rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2.5rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: #fff;
  font-weight: 700;
  font-size: 1.2rem;
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
  color: #5cc98c;
}

.footer-tagline {
  margin: 1rem 0 1.25rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #93a69c;
  max-width: 360px;
}

.footer-socials {
  display: flex;
  gap: 0.6rem;
}

.social {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1b3128;
  color: #aebcb4;
  transition: background 0.18s, color 0.18s;
}

.social:hover {
  background: #1f7a4d;
  color: #fff;
}

.footer-col h3 {
  color: #fff;
  font-size: 0.95rem;
  margin: 0 0 1rem;
}

.footer-col a {
  display: block;
  color: #93a69c;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.35rem 0;
  transition: color 0.18s;
}

.footer-col a:hover {
  color: #5cc98c;
}

.footer-bottom {
  border-top: 1px solid #1d3329;
  padding: 1.5rem 1.25rem;
  text-align: center;
}

.footer-bottom p {
  margin: 0;
  font-size: 0.85rem;
  color: #7d8f86;
}

@media (max-width: 860px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
}

@media (max-width: 520px) {
  .footer-inner {
    grid-template-columns: 1fr;
  }
}
</style>
