<template>
  <div class="home">
    <TheHeader />

    <main>
      <!-- ============ Hero: search-first ============ -->
      <section class="hero">
        <div class="hero-inner">
          <span class="hero-eyebrow">Premium Digital Assets</span>

          <h1 class="hero-title">
            Temukan aset digital siap pakai untuk
            <span class="hl">proyek Anda</span>
          </h1>

          <p class="hero-sub">
            Source code, ebook teknis, dan layanan web — langsung diunduh setelah pembayaran.
          </p>

          <!-- Primary action: search -->
          <form class="hero-search" role="search" @submit.prevent="onSearch">
            <span class="hero-search-icon" aria-hidden="true">
              <AppIcon name="search" :size="20" />
            </span>
            <label class="sr-only" for="hero-search-input">Cari produk</label>
            <input
              id="hero-search-input"
              v-model="searchTerm"
              type="search"
              class="hero-search-input"
              placeholder="Cari source code, ebook, template…"
              autocomplete="off"
            />
            <button type="submit" class="hero-search-btn" :disabled="!canSearch">
              Cari
            </button>
          </form>
          <p class="hero-search-hint">Tekan <kbd>Ctrl</kbd> + <kbd>K</kbd> untuk pencarian cepat dari halaman mana pun.</p>

          <!-- Category chips -->
          <ul v-if="collections.length" class="hero-chips">
            <li v-for="c in collections" :key="c.id">
              <NuxtLink :to="categoryUrl(c.slug)" class="hero-chip">
                {{ c.name }}
              </NuxtLink>
            </li>
          </ul>

          <!-- Trust signals -->
          <ul class="hero-trust">
            <li>
              <AppIcon name="check" :size="15" />
              <span><strong>Tanpa daftar akun</strong> — beli langsung, tautan dikirim ke email &amp; WhatsApp</span>
            </li>
            <li>
              <AppIcon name="download" :size="15" />
              <span>Pengiriman instan setelah pembayaran</span>
            </li>
            <li>
              <AppIcon name="lock" :size="15" />
              <span>Unduhan aman via tautan sementara</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- ============ Payment methods ============ -->
      <section class="payment-strip" aria-labelledby="payment-strip-title">
        <div class="payment-strip-inner">
          <p id="payment-strip-title" class="payment-strip-label">Pembayaran aman via Tripay</p>
          <ul class="payment-logos">
            <li v-for="m in paymentMethods" :key="m.file">
              <img :src="`/img/payment/${m.file}`" :alt="m.name" loading="lazy" decoding="async" />
            </li>
          </ul>
        </div>
      </section>

      <!-- ============ Categories ============ -->
      <section v-if="collections.length" class="section">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Kategori</span>
            <h2 class="section-title">Jelajahi berdasarkan jenis</h2>
          </div>
          <NuxtLink to="/products" class="view-all">
            Lihat Semua
            <AppIcon name="arrowRight" :size="16" />
          </NuxtLink>
        </div>

        <div class="grid-categories">
          <NuxtLink
            v-for="c in collections"
            :key="c.id"
            :to="categoryUrl(c.slug)"
            class="category-card"
          >
            <span class="category-icon">
              <AppIcon :name="presentationFor(c.slug).icon" :size="26" />
            </span>
            <h3>{{ c.name }}</h3>
            <p>{{ presentationFor(c.slug).desc }}</p>
            <span class="category-link">
              Lihat kategori
              <AppIcon name="arrowRight" :size="16" />
            </span>
          </NuxtLink>
        </div>
      </section>

      <!-- ============ Latest products ============ -->
      <section class="section">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Katalog</span>
            <h2 class="section-title">Produk Terbaru</h2>
          </div>
          <NuxtLink to="/products" class="view-all">
            Lihat Semua
            <AppIcon name="arrowRight" :size="16" />
          </NuxtLink>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="grid-products">
          <ProductCard v-for="n in 4" :key="`sk-${n}`" :product="null" />
        </div>

        <!-- Honest empty state — never invent products -->
        <div v-else-if="latestProducts.length === 0" class="state-box">
          <span class="state-icon">
            <AppIcon name="package" :size="30" />
          </span>
          <h3>Belum ada produk</h3>
          <p>Katalog sedang kami siapkan. Hubungi kami bila Anda butuh aset tertentu.</p>
          <a
            v-if="whatsappLink"
            :href="whatsappLink"
            class="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon name="whatsapp" :size="18" />
            Tanya via WhatsApp
          </a>
        </div>

        <!-- Grid -->
        <div v-else class="grid-products">
          <ProductCard
            v-for="product in latestProducts"
            :key="product.id"
            :product="product"
            :badge="badgeFor(product)"
          />
        </div>
      </section>

      <!-- ============ Features ============ -->
      <section class="section features">
        <div v-for="feat in features" :key="feat.title" class="feature">
          <span class="feature-icon">
            <AppIcon :name="feat.icon" :size="24" />
          </span>
          <h3>{{ feat.title }}</h3>
          <p>{{ feat.desc }}</p>
        </div>
      </section>

      <!-- ============ FAQ ============ -->
      <section class="section faq-section">
        <div class="section-head section-head-center">
          <span class="section-eyebrow">Bantuan</span>
          <h2 class="section-title">Pertanyaan Umum</h2>
        </div>

        <div class="faq-list">
          <div
            v-for="(faq, i) in faqs"
            :key="i"
            class="faq-item"
            :class="{ 'faq-open': openFaq === i }"
          >
            <button
              type="button"
              class="faq-trigger"
              :aria-expanded="openFaq === i"
              :aria-controls="`faq-panel-${i}`"
              @click="toggleFaq(i)"
            >
              <span class="faq-label">{{ faq.q }}</span>
              <span class="faq-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </button>
            <div
              :id="`faq-panel-${i}`"
              class="faq-panel"
              :class="{ 'faq-panel-open': openFaq === i }"
              role="region"
            >
              <div class="faq-content">
                <p>{{ faq.a }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShop, type Product } from '~/composables/useShop'
import { useWhatsapp } from '~/composables/useWhatsapp'
import { GET_COLLECTIONS } from '~/graphql/queries/collections'
import { categoryUrl, excludeTestProducts, searchUrl } from '~/utils/catalog'

useHead({
  title: 'NgopiCode Digital Store - Aset Digital Premium untuk Developer',
  meta: [
    {
      name: 'description',
      content:
        'Koleksi source code, ebook teknis, dan layanan web premium untuk developer Indonesia. Beli tanpa daftar akun, produk dikirim instan.',
    },
  ],
})

// ---------------------------------------------------------------- WhatsApp CTA
const { whatsappNumber, fetchWhatsappNumber } = useWhatsapp()

const whatsappLink = computed(() => {
  if (!whatsappNumber.value) return ''
  const cleanNumber = whatsappNumber.value.replace(/\D/g, '')
  const message = encodeURIComponent('Halo NgopiCode, saya butuh bantuan (support).')
  return `https://wa.me/${cleanNumber}?text=${message}`
})

// ---------------------------------------------------------------- Hero search
const MIN_SEARCH_LENGTH = 2
const searchTerm = ref('')
const canSearch = computed(() => searchTerm.value.trim().length >= MIN_SEARCH_LENGTH)

function onSearch() {
  if (!canSearch.value) return
  navigateTo(searchUrl(searchTerm.value))
}

// ---------------------------------------------------------------- Categories
interface Collection {
  id: string
  name: string
  slug: string
}

const collections = ref<Collection[]>([])

/** Per-slug icon + blurb; falls back gracefully for collections added later. */
const CATEGORY_PRESENTATION: Record<string, { icon: string; desc: string }> = {
  'source-code': {
    icon: 'code',
    desc: 'Script dan template siap pakai untuk mempercepat proyek Anda.',
  },
  ebooks: {
    icon: 'book',
    desc: 'Materi teknis mendalam untuk meningkatkan keahlian Anda.',
  },
  services: {
    icon: 'briefcase',
    desc: 'Layanan pengembangan web sesuai kebutuhan bisnis Anda.',
  },
}

const FALLBACK_PRESENTATION = {
  icon: 'package',
  desc: 'Koleksi produk digital pilihan untuk developer.',
}

function presentationFor(slug: string) {
  return CATEGORY_PRESENTATION[slug] ?? FALLBACK_PRESENTATION
}

async function loadCollections() {
  try {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({
      query: GET_COLLECTIONS,
      fetchPolicy: 'cache-first',
    })
    collections.value = data?.collections?.items ?? []
  } catch {
    collections.value = []
  }
}

// ---------------------------------------------------------------- Products
const { products, loading, fetchProducts } = useShop()

/**
 * Newest products, with test data removed.
 *
 * Previously this fell back to four hardcoded products with invented prices, so
 * an empty or failed catalog showed shoppers products that did not exist.
 * We now show only real data, and an explicit empty state otherwise.
 */
const latestProducts = computed<Product[]>(() =>
  excludeTestProducts(products.value).slice(0, 8),
)

/**
 * Badge shows the product's category (its first assigned collection), matching
 * the catalog page. No invented "bestseller" claim — there is no sales data to
 * support one.
 */
function badgeFor(product: Product): string | null {
  const ids: string[] = product.collectionIds ?? []
  if (ids.length > 0) {
    const matched = collections.value.find((c) => String(c.id) === String(ids[0]))
    if (matched?.name) return matched.name
  }
  return null
}

// ---------------------------------------------------------------- Payment strip
const paymentMethods = [
  { file: 'bri.svg', name: 'BRI Virtual Account' },
  { file: 'bni.svg', name: 'BNI Virtual Account' },
  { file: 'mandiri.svg', name: 'Mandiri Virtual Account' },
  { file: 'bca.svg', name: 'BCA Virtual Account' },
  { file: 'ovo.svg', name: 'OVO' },
  { file: 'dana.svg', name: 'DANA' },
  { file: 'shopeepay.svg', name: 'ShopeePay' },
  { file: 'qris.svg', name: 'QRIS' },
]

// ---------------------------------------------------------------- Static content
const features = [
  {
    icon: 'download',
    title: 'Pengiriman Instan',
    desc: 'Terima aset digital Anda segera setelah pembelian via tautan unduhan aman.',
  },
  {
    icon: 'lock',
    title: 'Akses Aman',
    desc: 'Unduhan dan data Anda dilindungi tautan sementara dan autentikasi aman.',
  },
  {
    icon: 'support',
    title: 'Dukungan 24/7',
    desc: 'Tim teknis kami selalu siap membantu implementasi aset baru Anda.',
  },
]

const faqs = [
  {
    q: 'Apakah saya harus mendaftar akun untuk membeli?',
    a: 'Tidak. Anda bisa membeli tanpa membuat akun — cukup isi email dan nomor WhatsApp. Tautan unduhan dikirim ke email dan WhatsApp Anda, dan bisa dibuka kapan saja. Jika ingin, Anda dapat membuat password setelah pembelian untuk menyimpan pembelian itu ke akun.',
  },
  {
    q: 'Bagaimana cara membeli produk di NgopiCode?',
    a: 'Pilih produk yang diinginkan, klik tombol beli, pilih metode pembayaran (Virtual Account, E-Wallet, atau QRIS), lalu selesaikan pembayaran. Setelah pembayaran dikonfirmasi, tautan unduhan langsung dikirim ke email dan WhatsApp Anda.',
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Kami menerima Virtual Account (BRI, BNI, Mandiri, BCA), E-Wallet (OVO, DANA, ShopeePay), dan QRIS. Semua pembayaran diproses secara otomatis melalui gateway Tripay.',
  },
  {
    q: 'Bagaimana cara mengunduh produk setelah pembelian?',
    a: 'Buka tautan yang kami kirim ke email atau WhatsApp Anda. Tautan itu langsung membuka halaman unduhan. Link unduhan bersifat sementara (5 menit) dan aman, dan bisa dibuat ulang.',
  },
  {
    q: 'Apakah ada batas waktu untuk mengunduh produk?',
    a: 'Tidak ada batas waktu permanen. Anda bisa meminta tautan akses baru kapan saja dari halaman Cek Pesanan, selama email yang Anda masukkan sama dengan saat pembelian.',
  },
  {
    q: 'Bagaimana jika saya mengalami masalah dengan produk?',
    a: 'Hubungi kami melalui WhatsApp atau email yang tersedia di halaman kontak. Tim kami akan merespons dalam 1x24 jam kerja.',
  },
]

// ---------------------------------------------------------------- FAQ accordion
const openFaq = ref<number | null>(null)

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index
}

onMounted(() => {
  // Fetch a few extra so removing test data still leaves a full grid.
  fetchProducts({ take: 12 })
  fetchWhatsappNumber()
  loadCollections()
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

/* Screen-reader-only label */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ============ Hero ============ */
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--bg-hero-top) 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 860px;
  margin: 0 auto;
  padding: 4rem 1.25rem 3.5rem;
  text-align: center;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary-text);
  background: var(--primary-soft);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 1.4rem;
}

.hero-title {
  font-size: clamp(2rem, 5.2vw, 3.2rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
  font-weight: 800;
}

.hero-title .hl {
  color: var(--primary-text);
}

.hero-sub {
  font-size: clamp(1rem, 2.2vw, 1.1rem);
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 560px;
  margin: 0 auto 2rem;
}

/* Search */
.hero-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 620px;
  margin: 0 auto;
  padding: 0.4rem 0.4rem 0.4rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  box-shadow: 0 6px 20px var(--shadow-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.hero-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.hero-search-icon {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.hero-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
  /* 16px+ avoids iOS auto-zoom on focus */
  padding: 0.65rem 0;
}

.hero-search-input::placeholder {
  color: var(--text-muted);
}

.hero-search-btn {
  flex-shrink: 0;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.95rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s ease, opacity 0.18s ease;
}

.hero-search-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.hero-search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hero-search-hint {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.hero-search-hint kbd {
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  background: var(--surface-2);
}

/* Chips */
.hero-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
}

.hero-chip {
  /* inline-flex + min-height keeps the tap target at the 44px minimum */
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.hero-chip:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-text);
}

/* Trust list */
.hero-trust {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.5rem;
  list-style: none;
  margin: 2rem 0 0;
  padding: 0;
}

.hero-trust li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.hero-trust svg {
  color: var(--primary-text);
  flex-shrink: 0;
}

.hero-trust strong {
  color: var(--text);
}

/* ============ Payment strip ============ */
.payment-strip {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.payment-strip-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
}

.payment-strip-label {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}

.payment-logos {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.payment-logos img {
  height: 22px;
  width: auto;
  object-fit: contain;
  opacity: 0.85;
  transition: opacity 0.18s ease;
}

.payment-logos img:hover {
  opacity: 1;
}

/* ============ Sections ============ */
.section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3.5rem 1.25rem;
  width: 100%;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-head-center {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.section-eyebrow {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary-text);
  margin-bottom: 0.4rem;
}

.section-title {
  font-size: clamp(1.4rem, 3vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  /* Keeps the tap target at the 44px minimum */
  min-height: 44px;
  padding: 0.4rem 0.7rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--primary-text);
  text-decoration: none;
  white-space: nowrap;
  border-radius: 8px;
  transition: background 0.18s ease;
}

.view-all:hover {
  background: var(--primary-soft);
}

/* ============ Categories ============ */
.grid-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.category-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.category-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 14px 32px var(--shadow-card-strong);
}

.category-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin-bottom: 0.4rem;
}

.category-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.category-card p {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0 0 0.5rem;
}

.category-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: auto;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-text);
}

/* ============ Products ============ */
.grid-products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.25rem;
}

/* ============ Empty state ============ */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 3.5rem 1.5rem;
  text-align: center;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: 16px;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin-bottom: 0.4rem;
}

.state-box h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
}

.state-box p {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
  max-width: 420px;
  line-height: 1.55;
}

/* ============ Features ============ */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  padding-top: 0;
}

.feature {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin-bottom: 0.25rem;
}

.feature h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.feature p {
  font-size: 0.87rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
}

/* ============ FAQ ============ */
.faq-list {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.faq-item {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.18s ease;
}

.faq-item.faq-open {
  border-color: var(--primary);
}

.faq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.05rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  text-align: left;
}

.faq-icon {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.faq-item.faq-open .faq-icon {
  transform: rotate(180deg);
  color: var(--primary-text);
}

.faq-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}

.faq-panel-open {
  grid-template-rows: 1fr;
}

.faq-content {
  overflow: hidden;
}

.faq-content p {
  margin: 0;
  padding: 0 1.25rem 1.15rem;
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--text-muted);
}

/* ============ Buttons ============ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background 0.18s ease;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

/* ============ Focus visibility ============ */
.hero-chip:focus-visible,
.hero-search-btn:focus-visible,
.category-card:focus-visible,
.view-all:focus-visible,
.faq-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ============ Responsive ============ */
@media (max-width: 640px) {
  .hero-inner {
    padding: 3rem 1.25rem 2.5rem;
  }

  .hero-search {
    flex-wrap: wrap;
    padding: 0.75rem;
    gap: 0.6rem;
  }

  .hero-search-icon {
    display: none;
  }

  .hero-search-input {
    width: 100%;
    padding: 0.4rem 0.25rem;
  }

  .hero-search-btn {
    width: 100%;
    padding: 0.85rem;
  }

  .hero-search-hint {
    display: none;
  }

  .hero-trust {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 0.6rem;
  }

  .section {
    padding: 2.5rem 1.25rem;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .grid-products,
  .grid-categories {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .category-card,
  .faq-panel,
  .faq-icon,
  .hero-chip,
  .product-card {
    transition: none;
  }

  .category-card:hover {
    transform: none;
  }
}
</style>
