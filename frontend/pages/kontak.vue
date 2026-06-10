<template>
  <div class="static-page">
    <TheHeader />
    <main class="static-main">
      <h1>Kontak Support</h1>

      <p class="intro">
        Butuh bantuan atau punya pertanyaan? Hubungi kami melalui salah satu channel berikut.
        Tim kami akan merespon secepat mungkin.
      </p>

      <div class="contact-cards">
        <div class="contact-card">
          <div class="card-icon">
            <AppIcon name="whatsapp" :size="24" />
          </div>
          <div class="card-body">
            <h2>WhatsApp</h2>
            <p>Cara tercepat untuk menghubungi kami. Tersedia di jam kerja (09:00 - 21:00 WIB).</p>
            <a
              v-if="whatsappNumber"
              :href="`https://wa.me/${whatsappNumber}`"
              target="_blank"
              rel="noopener noreferrer"
              class="contact-link"
            >
              Chat via WhatsApp
            </a>
          </div>
        </div>

        <div class="contact-card">
          <div class="card-icon">
            <AppIcon name="mail" :size="24" />
          </div>
          <div class="card-body">
            <h2>Email</h2>
            <p>Untuk pertanyaan yang lebih detail atau pengajuan refund.</p>
            <a
              v-if="ownerEmail"
              :href="`mailto:${ownerEmail}`"
              class="contact-link"
            >
              {{ ownerEmail }}
            </a>
          </div>
        </div>

        <div class="contact-card">
          <div class="card-icon">
            <AppIcon name="github" :size="24" />
          </div>
          <div class="card-body">
            <h2>GitHub</h2>
            <p>Laporkan bug atau issue teknis terkait produk.</p>
            <a
              v-if="githubLink"
              :href="githubLink"
              target="_blank"
              rel="noopener noreferrer"
              class="contact-link"
            >
              Kunjungi GitHub
            </a>
          </div>
        </div>
      </div>

      <section class="faq-promo">
        <h2>Pertanyaan Umum</h2>
        <p>
          Sebelum menghubungi kami, cek apakah pertanyaan Anda sudah terjawab di
          <NuxtLink to="/#faq">halaman FAQ</NuxtLink>.
        </p>
      </section>
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { useWhatsapp } from '~/composables/useWhatsapp'

const { whatsappNumber, githubLink, ownerEmail, fetchWhatsappNumber } = useWhatsapp()

onMounted(async () => {
  await fetchWhatsappNumber()
})

useHead({ title: 'Kontak Support - NgopiCode' })
</script>

<style scoped>
.static-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.static-main {
  flex: 1;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.static-main h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
}

.intro {
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.contact-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.18s;
}

.contact-card:hover {
  border-color: var(--primary);
}

.card-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-text);
  flex-shrink: 0;
}

.card-body h2 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}

.card-body p {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 0.6rem;
}

.contact-link {
  display: inline-block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary-text);
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

.faq-promo {
  margin-top: 2.5rem;
  padding: 1.25rem;
  background: var(--surface-2);
  border-radius: 12px;
}

.faq-promo h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.faq-promo p {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

.faq-promo a {
  color: var(--primary-text);
  text-decoration: underline;
}
</style>
