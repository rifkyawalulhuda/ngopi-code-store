<template>
  <div class="home">
    <TheHeader />

    <main>
      <!-- Hero -->
      <section class="hero">
        <div class="hero-inner hero-split">
          <div class="hero-lottie">
            <LottiePlayer src="/animations/hero-rocket.lottie" :loop="true" :autoplay="true" />
          </div>
          <div class="hero-content">
            <span class="hero-eyebrow">Premium Digital Assets</span>
            <h1 class="hero-title">
              Solusi Web Modern untuk
              <span class="hl">Developer</span>
            </h1>
            <p class="hero-sub">
              Tingkatkan alur kerja pengembangan Anda dengan koleksi kurasi source code,
              ebook teknis, dan layanan web khusus.
            </p>
            <div class="hero-cta">
              <NuxtLink to="/products" class="btn btn-primary">
                Jelajahi Katalog
                <AppIcon name="arrowRight" :size="18" />
              </NuxtLink>
              <a href="#bestsellers" class="btn btn-ghost">Lihat Best-Seller</a>
            </div>
          </div>
        </div>
        <div class="hero-glow" aria-hidden="true" />
      </section>

      <!-- Category cards -->
      <section class="section categories">
        <div
          v-for="cat in categories"
          :key="cat.slug"
          class="category-card"
        >
          <span class="category-icon">
            <AppIcon :name="cat.icon" :size="26" />
          </span>
          <h3>{{ cat.title }}</h3>
          <p>{{ cat.desc }}</p>
          <NuxtLink :to="cat.to" class="category-link">
            {{ cat.cta }}
            <AppIcon name="arrowRight" :size="16" />
          </NuxtLink>
        </div>
      </section>

      <!-- Bestsellers -->
      <section id="bestsellers" class="section">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Pilihan Terbaik</span>
            <h2 class="section-title">Digital Best-Sellers</h2>
          </div>
          <NuxtLink to="/products" class="view-all">
            Lihat Semua
            <AppIcon name="arrowRight" :size="16" />
          </NuxtLink>
        </div>

        <div v-if="loading" class="grid-products">
          <div v-for="n in 4" :key="n" class="product-card skeleton">
            <div class="thumb skeleton-box" />
            <div class="skeleton-line" />
            <div class="skeleton-line short" />
          </div>
        </div>

        <div v-else class="grid-products">
          <article
            v-for="product in displayProducts"
            :key="product.id"
            class="product-card"
          >
            <div class="thumb">
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                loading="lazy"
              />
              <div v-else class="thumb-placeholder">
                <AppIcon name="code" :size="34" />
              </div>
              <span v-if="product.badge" class="badge">{{ product.badge }}</span>
            </div>
            <div class="product-body">
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-price">{{ product.priceLabel }}</p>
              <NuxtLink :to="product.to" class="btn btn-sm">
                {{ product.cta }}
              </NuxtLink>
            </div>
          </article>
        </div>
      </section>

      <!-- Features -->
      <section class="section features">
        <div v-for="feat in features" :key="feat.title" class="feature">
          <span class="feature-icon">
            <AppIcon :name="feat.icon" :size="24" />
          </span>
          <h3>{{ feat.title }}</h3>
          <p>{{ feat.desc }}</p>
        </div>
      </section>

      <!-- Newsletter -->
      <section class="section">
        <div class="newsletter">
          <h2>Gabung Developer Circle</h2>
          <p>
            Berlangganan untuk mendapat akses awal ke rilisan kode baru, wawasan teknis,
            dan diskon layanan eksklusif.
          </p>
          <form class="newsletter-form" @submit.prevent="onSubscribe">
            <input
              v-model="email"
              type="email"
              required
              placeholder="email@anda.com"
              aria-label="Alamat email"
            />
            <button type="submit" class="btn btn-primary">Berlangganan</button>
          </form>
          <p v-if="subscribed" class="newsletter-note success">
            Terima kasih! Anda berhasil berlangganan.
          </p>
          <p v-else class="newsletter-note">
            Dengan berlangganan, Anda menyetujui Kebijakan Privasi kami.
          </p>
        </div>
      </section>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShop } from '~/composables/useShop'
import { formatPriceIDR } from '~/utils/format'

useHead({
  title: 'NgopiCode Digital Store - Aset Digital Premium untuk Developer',
  meta: [
    {
      name: 'description',
      content:
        'Koleksi source code, ebook teknis, dan layanan web premium untuk developer Indonesia.',
    },
  ],
})

const categories = [
  {
    slug: 'source-code',
    icon: 'code',
    title: 'Source Code',
    desc: 'Script dan template siap pakai untuk mempercepat proyek Anda.',
    cta: 'Belanja Script',
    to: '/products?category=source-code',
  },
  {
    slug: 'ebooks',
    icon: 'book',
    title: 'Ebooks',
    desc: 'Materi teknis mendalam untuk meningkatkan keahlian Anda.',
    cta: 'Pelajari',
    to: '/products?category=ebooks',
  },
  {
    slug: 'services',
    icon: 'briefcase',
    title: 'Web Services',
    desc: 'Layanan pengembangan web khusus sesuai kebutuhan bisnis.',
    cta: 'Lihat Layanan',
    to: '/products?category=services',
  },
]

const features = [
  {
    icon: 'download',
    title: 'Pengiriman Instan',
    desc: 'Terima aset digital Anda segera setelah pembelian via tautan unduhan aman.',
  },
  {
    icon: 'lock',
    title: 'Akses Aman',
    desc: 'Unduhan dan data Anda dilindungi enkripsi tingkat enterprise dan autentikasi aman.',
  },
  {
    icon: 'support',
    title: 'Dukungan 24/7',
    desc: 'Tim teknis kami selalu siap membantu implementasi aset baru Anda.',
  },
]

// Sample fallback shown when the catalog is empty (fresh store)
const sampleProducts = [
  { id: 's1', name: 'SaaS Dashboard Template', priceLabel: 'Rp 1.350.000', badge: 'Bestseller', cta: 'Unduh', to: '/products', image: null },
  { id: 's2', name: 'Mastering Web Architecture', priceLabel: 'Rp 590.000', badge: null, cta: 'Selengkapnya', to: '/products', image: null },
  { id: 's3', name: 'Custom Corporate Website', priceLabel: 'Mulai Rp 38.000.000', badge: null, cta: 'Dapatkan', to: '/products', image: null },
  { id: 's4', name: 'React Component Library', priceLabel: 'Rp 1.800.000', badge: null, cta: 'Unduh', to: '/products', image: null },
]

const { products, loading, fetchProducts } = useShop()

const displayProducts = computed(() => {
  if (!products.value.length) return sampleProducts
  return products.value.slice(0, 4).map((p) => {
    const price = p.variants?.[0]?.price
    return {
      id: p.id,
      name: p.name,
      priceLabel: price != null ? formatPriceIDR(price) : 'Lihat detail',
      badge: null as string | null,
      cta: 'Lihat Produk',
      to: `/products`,
      image: p.featuredAsset?.preview ?? null,
    }
  })
})

const email = ref('')
const subscribed = ref(false)
function onSubscribe() {
  if (email.value) {
    subscribed.value = true
    email.value = ''
  }
}

onMounted(() => {
  fetchProducts({ take: 4 })
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

main {
  flex: 1;
}

/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--bg-hero-top) 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 1.25rem 4.5rem;
}

.hero-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  align-items: center;
}

.hero-lottie {
  width: 100%;
  max-width: 480px;
  aspect-ratio: 1;
  margin: 0 auto;
}

.hero-content {
  text-align: left;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary-text);
  background: var(--primary-soft);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 1.5rem;
}

.hero-title {
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0 0 1.25rem;
  font-weight: 800;
}

.hero-title .hl {
  color: var(--primary-text);
}

.hero-sub {
  font-size: clamp(1rem, 2.2vw, 1.15rem);
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 520px;
  margin: 0 0 2.25rem;
}

.hero-cta {
  display: flex;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.hero-glow {
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--hero-glow) 0%, transparent 60%);
  pointer-events: none;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  box-sizing: border-box;
  transition: transform 0.15s, background 0.18s, box-shadow 0.18s;
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
  box-shadow: 0 6px 18px rgba(31, 122, 77, 0.25);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-ghost {
  background: var(--btn-ghost-bg);
  color: var(--primary-text);
  border-color: var(--btn-ghost-border);
}

.btn-ghost:hover {
  background: var(--btn-ghost-hover);
}

.btn-sm {
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  background: var(--btn-sm-bg);
  color: var(--primary-text);
  width: 100%;
  justify-content: center;
}

.btn-sm:hover {
  background: var(--btn-sm-hover);
}

/* Sections */
.section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 1.25rem;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.25rem;
}

.section-eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary-text);
}

.section-title {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  letter-spacing: -0.02em;
  margin: 0.35rem 0 0;
  font-weight: 800;
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--primary-text);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  white-space: nowrap;
}

.view-all:hover {
  text-decoration: underline;
}

/* Categories */
.categories {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.category-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  transition: transform 0.18s, box-shadow 0.18s;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px var(--shadow-card);
}

.category-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin-bottom: 1.25rem;
}

.category-card h3 {
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
}

.category-card p {
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0 0 1.25rem;
  font-size: 0.95rem;
}

.category-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--primary-text);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.category-link:hover {
  gap: 0.6rem;
}

/* Products */
.grid-products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  align-items: stretch;
}

.product-card {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px var(--shadow-card);
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: var(--btn-ghost-border);
  box-shadow: 0 12px 30px var(--shadow-card-strong);
}

.thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--placeholder-icon);
}

.badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: var(--primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
}

.product-body {
  padding: 1.1rem 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.product-name {
  font-size: 1rem;
  margin: 0;
  line-height: 1.35;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.7em;
}

.product-price {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--primary-text);
  margin: 0 0 0.65rem;
}

.product-body .btn-sm {
  margin-top: auto;
}

/* Skeleton */
.skeleton-box,
.skeleton-line {
  background: linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
}

.skeleton .thumb {
  background: none;
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  margin: 0.75rem 1.1rem 0;
}

.skeleton-line.short {
  width: 50%;
  margin-bottom: 1.1rem;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.feature {
  text-align: center;
  padding: 1rem;
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin: 0 auto 1.25rem;
}

.feature h3 {
  font-size: 1.15rem;
  margin: 0 0 0.6rem;
}

.feature p {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 0.95rem;
  margin: 0;
  max-width: 320px;
  margin: 0 auto;
}

/* Newsletter */
.newsletter {
  background: linear-gradient(135deg, #14241b 0%, #1f4733 100%);
  border-radius: 22px;
  padding: 3.5rem 2rem;
  text-align: center;
  color: #fff;
}

.newsletter h2 {
  font-size: clamp(1.6rem, 4vw, 2.1rem);
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
}

.newsletter > p {
  color: #b9cabf;
  max-width: 520px;
  margin: 0 auto 2rem;
  line-height: 1.6;
}

.newsletter-form {
  display: flex;
  gap: 0.6rem;
  max-width: 480px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.newsletter-form input {
  flex: 1;
  min-width: 200px;
  padding: 0.85rem 1.1rem;
  border-radius: 10px;
  border: 1px solid #2e5743;
  background: #0f1d16;
  color: #fff;
  font-size: 0.95rem;
}

.newsletter-form input::placeholder {
  color: #7d958a;
}

.newsletter-form input:focus {
  outline: 2px solid #5cc98c;
  outline-offset: 1px;
}

.newsletter-note {
  margin: 1.25rem 0 0;
  font-size: 0.85rem;
  color: #8ba295;
}

.newsletter-note.success {
  color: #5cc98c;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 960px) {
  .categories {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 760px) {
  .features {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
  .section {
    padding: 3rem 1.25rem;
  }
}

@media (max-width: 540px) {
  .categories {
    grid-template-columns: 1fr;
  }
  .hero-inner {
    padding: 3rem 1.25rem 3.5rem;
  }
  .hero-split {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-content {
    text-align: center;
  }
  .hero-lottie {
    max-width: 280px;
    order: -1;
  }
  .hero-cta {
    justify-content: center;
  }
  .hero-cta .btn {
    width: 100%;
    justify-content: center;
  }
  .newsletter {
    padding: 2.5rem 1.25rem;
  }
}
</style>
