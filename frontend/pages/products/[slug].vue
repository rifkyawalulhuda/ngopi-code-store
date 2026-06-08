<template>
  <div class="pdp">
    <TheHeader />

    <main class="pdp-main">
      <!-- Breadcrumb -->
      <nav class="crumbs" aria-label="Breadcrumb">
        <NuxtLink to="/">Beranda</NuxtLink>
        <span aria-hidden="true">/</span>
        <NuxtLink to="/products">Katalog</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>{{ product?.name ?? 'Produk' }}</span>
      </nav>

      <!-- Loading -->
      <div v-if="loading" class="pdp-skeleton">
        <div class="skel-gallery skeleton-box" />
        <div class="skel-info">
          <div class="skeleton-line w60" />
          <div class="skeleton-line w80" />
          <div class="skeleton-line w40" />
        </div>
      </div>

      <!-- Not found -->
      <div v-else-if="!product" class="state-box">
        <div class="state-icon"><AppIcon name="search" :size="32" /></div>
        <h2>Produk tidak ditemukan</h2>
        <p>Produk yang Anda cari mungkin sudah tidak tersedia.</p>
        <NuxtLink to="/products" class="btn btn-primary">Kembali ke Katalog</NuxtLink>
      </div>

      <!-- Product detail -->
      <template v-else>
        <div class="pdp-grid">
          <!-- Gallery -->
          <div class="gallery">
            <div class="gallery-main" @click="openLightbox(activeIndex)">
              <img
                v-if="galleryImages.length"
                :src="galleryImages[activeIndex].preview"
                :alt="product.name"
                class="gallery-img"
              />
              <div v-else class="gallery-placeholder">
                <AppIcon name="image" :size="48" />
              </div>
              <span class="gallery-badge">{{ badgeLabel }}</span>
              <span v-if="galleryImages.length > 1" class="gallery-zoom" aria-hidden="true">
                <AppIcon name="search" :size="18" />
              </span>
            </div>
            <!-- Thumbnails -->
            <div v-if="galleryImages.length > 1" class="gallery-thumbs">
              <button
                v-for="(img, idx) in galleryImages"
                :key="img.id"
                type="button"
                class="thumb-btn"
                :class="{ active: idx === activeIndex }"
                :aria-label="`Lihat gambar ${idx + 1}`"
                @click="activeIndex = idx"
              >
                <img :src="img.preview" :alt="`${product.name} - gambar ${idx + 1}`" />
              </button>
            </div>
          </div>

          <!-- Lightbox -->
          <Teleport to="body">
            <transition name="lightbox">
              <div
                v-if="lightboxOpen"
                class="lightbox"
                role="dialog"
                aria-modal="true"
                aria-label="Galeri gambar produk"
                @click.self="closeLightbox"
                @keydown.escape="closeLightbox"
              >
                <button class="lightbox-close" type="button" aria-label="Tutup" @click="closeLightbox">
                  <AppIcon name="close" :size="24" />
                </button>
                <button
                  v-if="galleryImages.length > 1"
                  class="lightbox-nav lightbox-prev"
                  type="button"
                  aria-label="Gambar sebelumnya"
                  @click="prevImage"
                >
                  ‹
                </button>
                <img
                  :src="galleryImages[lightboxIndex].source || galleryImages[lightboxIndex].preview"
                  :alt="product.name"
                  class="lightbox-img"
                />
                <button
                  v-if="galleryImages.length > 1"
                  class="lightbox-nav lightbox-next"
                  type="button"
                  aria-label="Gambar berikutnya"
                  @click="nextImage"
                >
                  ›
                </button>
                <div v-if="galleryImages.length > 1" class="lightbox-counter">
                  {{ lightboxIndex + 1 }} / {{ galleryImages.length }}
                </div>
              </div>
            </transition>
          </Teleport>

          <!-- Info -->
          <div class="info">
            <h1 class="info-name">{{ product.name }}</h1>
            <p class="info-price">{{ priceLabel }}</p>
            <p class="info-desc">{{ cleanDescription }}</p>

            <!-- Key features -->
            <div class="features">
              <h3 class="features-title">Fitur Utama</h3>
              <ul class="features-list">
                <li v-for="feat in features" :key="feat">
                  <AppIcon name="check" :size="18" class="feat-icon" />
                  <span>{{ feat }}</span>
                </li>
              </ul>
            </div>

            <!-- Delivery info -->
            <div class="delivery-box">
              <AppIcon name="package" :size="20" class="delivery-icon" />
              <div>
                <strong>Info Pengiriman Digital</strong>
                <p>{{ deliveryInfo }}</p>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="alreadyOwned" class="owned-banner">
              <div class="owned-icon">
                <AppIcon name="check" :size="20" />
              </div>
              <div class="owned-content">
                <span class="owned-title">Kamu sudah memiliki produk ini</span>
                <span class="owned-desc">Akses produk di Pustaka Digital kamu.</span>
              </div>
              <NuxtLink to="/account" class="btn btn-primary btn-sm owned-link">
                Lihat di Pustaka
              </NuxtLink>
            </div>

            <div v-else class="actions">
              <button class="btn btn-primary btn-lg actions-buy" type="button" @click="onBuyNow">
                <AppIcon name="shoppingBag" :size="20" />
                Beli Sekarang
              </button>
              <button
                class="btn-icon-only"
                :class="{ 'wishlisted': productInWishlist }"
                type="button"
                :aria-label="productInWishlist ? 'Hapus dari wishlist' : 'Tambah ke wishlist'"
                @click="onWishlist"
              >
                <AppIcon name="heart" :size="20" />
              </button>
            </div>

            <!-- WhatsApp Contact -->
            <a
              v-if="whatsappUrl"
              :href="whatsappUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="wa-link"
              aria-label="Tanya via WhatsApp"
            >
              <AppIcon name="whatsapp" :size="18" />
              <span>Tanya via WhatsApp</span>
            </a>
          </div>
        </div>

        <!-- Description & Specs -->
        <section class="detail-section">
          <h2 class="detail-title">Deskripsi &amp; Spesifikasi</h2>
          <div class="detail-collapsible">
            <div
              ref="descBody"
              class="detail-body"
              :class="{ 'is-clamped': descClampable && !descExpanded }"
              v-html="product.description"
            />
            <button
              v-if="descClampable"
              type="button"
              class="desc-toggle"
              :aria-expanded="descExpanded"
              @click="descExpanded = !descExpanded"
            >
              <span>{{ descExpanded ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua' }}</span>
              <AppIcon
                name="chevronDown"
                :size="16"
                class="desc-toggle-icon"
                :class="{ 'is-open': descExpanded }"
              />
            </button>
          </div>

          <div v-if="specs.length" class="specs-table">
            <div v-for="spec in specs" :key="spec.label" class="spec-row">
              <span class="spec-label">{{ spec.label }}</span>
              <span class="spec-value">{{ spec.value }}</span>
            </div>
          </div>
        </section>

        <!-- Related products -->
        <section v-if="relatedProducts.length" class="related-section">
          <div class="related-head">
            <h2 class="related-title">Produk Terkait</h2>
            <NuxtLink to="/products" class="view-all">
              Lihat Semua
              <AppIcon name="arrowRight" :size="16" />
            </NuxtLink>
          </div>
          <div class="related-grid">
            <article v-for="rp in relatedProducts" :key="rp.id" class="related-card">
              <NuxtLink :to="`/products/${rp.slug}`" class="related-thumb">
                <img
                  v-if="rp.featuredAsset"
                  :src="rp.featuredAsset.preview"
                  :alt="rp.name"
                  loading="lazy"
                />
                <div v-else class="thumb-placeholder">
                  <AppIcon name="code" :size="28" />
                </div>
              </NuxtLink>
              <div class="related-body">
                <h3>{{ rp.name }}</h3>
                <span class="related-price">{{ formatRelatedPrice(rp) }}</span>
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useShop, type Product } from '~/composables/useShop'
import { useWhatsapp } from '~/composables/useWhatsapp'
import { formatPriceIDR } from '~/utils/format'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { getProductBySlug, products, fetchProducts } = useShop()
const { whatsappNumber, fetchWhatsappNumber, buildWhatsappUrl } = useWhatsapp()

const product = ref<Product | null>(null)
const loading = ref(true)
const relatedProducts = ref<Product[]>([])
const activeIndex = ref(0)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

// Collapsible description state
const descBody = ref<HTMLElement | null>(null)
const descExpanded = ref(false)
const descClampable = ref(false)
const DESC_CLAMP_HEIGHT = 260 // px — collapsed max-height threshold

function measureDescription() {
  const el = descBody.value
  if (!el) return
  // Toggle is only needed when content exceeds the clamp height
  descClampable.value = el.scrollHeight > DESC_CLAMP_HEIGHT + 24
}

// All product images (assets array, fallback to featuredAsset)
const galleryImages = computed(() => {
  if (!product.value) return []
  if (product.value.assets && product.value.assets.length > 0) {
    return product.value.assets
  }
  if (product.value.featuredAsset) {
    return [{ ...product.value.featuredAsset, source: product.value.featuredAsset.preview, name: product.value.name }]
  }
  return []
})

const mainImage = computed(() => product.value?.featuredAsset?.preview ?? null)

function openLightbox(idx: number) {
  if (!galleryImages.value.length) return
  lightboxIndex.value = idx
  lightboxOpen.value = true
  if (import.meta.client) document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  lightboxOpen.value = false
  if (import.meta.client) document.body.style.overflow = ''
}

function nextImage() {
  lightboxIndex.value = (lightboxIndex.value + 1) % galleryImages.value.length
}

function prevImage() {
  lightboxIndex.value = (lightboxIndex.value - 1 + galleryImages.value.length) % galleryImages.value.length
}

const priceLabel = computed(() => {
  const price = product.value?.variants?.[0]?.price
  return price != null ? formatPriceIDR(price) : 'Hubungi kami'
})

const cleanDescription = computed(() => {
  // Use dedicated short description custom field if available,
  // otherwise fall back to stripping HTML from the main description
  const short = product.value?.customFields?.shortDescription
  if (short) return short.trim()
  const desc = product.value?.description || ''
  return desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
})

// Dynamic features from custom field (one per line), with fallback
const features = computed(() => {
  const raw = product.value?.customFields?.keyFeatures
  if (raw) {
    return raw.split('\n').map((f: string) => f.trim()).filter(Boolean)
  }
  return ['Arsitektur Bersih', 'Fully Responsive', 'Dukungan Dark Mode', 'Dokumentasi Lengkap']
})

// Dynamic delivery info from custom field, with fallback
const deliveryInfo = computed(() => {
  return product.value?.customFields?.deliveryInfo
    || 'Download instan, update seumur hidup, lisensi personal & komersial.'
})

// Dynamic specs from custom fields, with fallback
const specs = computed(() => {
  if (!product.value) return []
  const cf = product.value.customFields
  return [
    { label: 'Tipe', value: cf?.productType || 'Source Code' },
    { label: 'Format', value: cf?.fileFormat || 'ZIP Archive' },
    { label: 'Lisensi', value: cf?.licenseType || 'Personal & Komersial' },
  ]
})

// Badge label from custom field
const badgeLabel = computed(() => {
  return (product.value?.customFields?.productType || 'SOURCE CODE').toUpperCase()
})

// Wishlist state
const { init: initWishlist, isInWishlist } = useWishlist()
if (import.meta.client) { initWishlist() }
const productInWishlist = computed(() => product.value ? isInWishlist(product.value.id) : false)

// Owned products state (check if user already purchased this product)
const { isLoggedIn: authLoggedIn } = useAuth()
const { fetchOwnedProducts, isOwned } = useOwnedProducts()

// Check if product is repeatable (service/jasa) based on Facet "purchase-rule"
const isRepeatable = computed(() => {
  if (!product.value?.facetValues) return false
  return product.value.facetValues.some(
    (fv: any) => fv.code === 'repeatable' || fv.facet?.code === 'purchase-rule' && fv.code === 'repeatable'
  )
})

// Only show "already owned" banner for non-repeatable products
const alreadyOwned = computed(() => {
  if (isRepeatable.value) return false
  return product.value ? isOwned(product.value.id) : false
})

onMounted(async () => {
  if (authLoggedIn.value) {
    await fetchOwnedProducts()
  }
})

// WhatsApp URL with pre-filled message
const whatsappUrl = computed(() => {
  if (!whatsappNumber.value || !product.value) return ''
  const productUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://ngopicode.com/products/${slug.value}`
  return buildWhatsappUrl(product.value.name, productUrl)
})

function onBuyNow() {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn.value) {
    navigateTo('/auth')
    return
  }

  if (product.value) {
    navigateTo(`/buy/${product.value.slug}`)
  }
}

function onWishlist() {
  if (!product.value) return

  const { isLoggedIn } = useAuth()
  const { init, toggleWishlist, isInWishlist } = useWishlist()
  init()

  // Guest user → redirect to login
  if (!isLoggedIn.value) {
    navigateTo('/auth')
    return
  }

  // Toggle wishlist
  const variant = product.value.variants?.[0]
  toggleWishlist({
    productId: product.value.id,
    variantId: variant?.id,
    name: product.value.name,
    slug: product.value.slug,
    price: variant?.price ?? 0,
    currencyCode: variant?.currencyCode ?? 'IDR',
    image: product.value.featuredAsset?.preview || null,
  })
}

function formatRelatedPrice(p: Product): string {
  const price = p.variants?.[0]?.price
  return price != null ? formatPriceIDR(price) : 'Lihat detail'
}

useHead({
  title: computed(() =>
    product.value
      ? `${product.value.name} - NgopiCode`
      : 'Produk - NgopiCode',
  ),
})

onMounted(async () => {
  loading.value = true
  product.value = await getProductBySlug(slug.value)
  loading.value = false

  // Measure description once rendered to decide if the toggle is needed
  await nextTick()
  measureDescription()

  // Fetch WhatsApp number and related products in parallel
  await Promise.all([
    fetchWhatsappNumber(),
    fetchProducts({ take: 4 }),
  ])
  relatedProducts.value = products.value
    .filter((p) => p.slug !== slug.value)
    .slice(0, 4)
})
</script>

<style scoped>
.pdp {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.pdp-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

/* Breadcrumb */
.crumbs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.crumbs a {
  color: var(--text-muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--primary-text);
}

/* Grid */
.pdp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
  margin-bottom: 3.5rem;
}

/* Gallery */
.gallery-main {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  cursor: zoom-in;
}

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery-main:hover .gallery-img {
  transform: scale(1.03);
}

.gallery-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--placeholder-icon);
}

.gallery-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
}

.gallery-zoom {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-main:hover .gallery-zoom {
  opacity: 1;
}

/* Thumbnails */
.gallery-thumbs {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.85rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.thumb-btn {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  background: var(--surface-2);
  transition: border-color 0.18s, opacity 0.18s;
}

.thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-btn:hover {
  opacity: 0.85;
}

.thumb-btn.active {
  border-color: var(--primary);
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(4px);
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  user-select: none;
}

.lightbox-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.12);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: background 0.18s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  transition: background 0.18s;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.22);
}

.lightbox-prev {
  left: 1.25rem;
}

.lightbox-next {
  right: 1.25rem;
}

.lightbox-counter {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

/* Info */
.info {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.info-name {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
}

.info-price {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--primary-text);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.info-desc {
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0;
  font-size: 0.98rem;
  max-width: 540px;
}

/* Features */
.features-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.features-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
}

.feat-icon {
  color: var(--primary-text);
  flex-shrink: 0;
}

/* Delivery box */
.delivery-box {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  background: var(--primary-soft);
  border-radius: 12px;
}

.delivery-icon {
  color: var(--primary-text);
  flex-shrink: 0;
  margin-top: 2px;
}

.delivery-box strong {
  display: block;
  font-size: 0.92rem;
  margin-bottom: 0.25rem;
}

.delivery-box p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.actions-buy {
  flex: 1;
}

.btn-icon-only {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
  flex-shrink: 0;
}

.btn-icon-only:hover {
  background: var(--btn-ghost-hover);
  color: #e74c6f;
  border-color: #e74c6f;
}

.btn-icon-only:active {
  transform: scale(0.95);
}

.btn-icon-only.wishlisted {
  background: #fef2f2;
  color: #e74c6f;
  border-color: #e74c6f;
}

.btn-icon-only.wishlisted svg {
  fill: #e74c6f;
}

[data-theme='dark'] .btn-icon-only.wishlisted {
  background: rgba(231, 76, 111, 0.12);
}

/* Owned product banner */
.owned-banner {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.15rem;
  background: var(--primary-soft);
  border: 1px solid var(--primary);
  border-radius: 12px;
}

.owned-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--primary-contrast);
  flex-shrink: 0;
}

.owned-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.owned-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--primary-text);
}

.owned-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.owned-link {
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

@media (max-width: 560px) {
  .owned-banner {
    flex-wrap: wrap;
  }
  .owned-link {
    width: 100%;
    text-align: center;
    justify-content: center;
  }
}

/* WhatsApp link (subtle, not competing with CTA) */
.wa-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: #25D366;
  text-decoration: none;
  padding: 0.35rem 0;
  transition: opacity 0.18s;
}

.wa-link:hover {
  opacity: 0.75;
  text-decoration: underline;
}

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

.btn-lg {
  padding: 0.9rem 1.75rem;
  font-size: 1rem;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
  box-shadow: 0 6px 18px rgba(31, 122, 77, 0.25);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

/* Detail section */
.detail-section {
  margin-bottom: 3.5rem;
}

.detail-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
}

.detail-body {
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 0.98rem;
  max-width: 720px;
  margin-bottom: 2rem;
}

.detail-body :deep(p) {
  margin: 0 0 1rem;
}

/* Collapsible description */
.detail-collapsible {
  margin-bottom: 2rem;
}

.detail-collapsible .detail-body {
  margin-bottom: 0;
  transition: max-height 0.3s ease;
}

.detail-collapsible .detail-body.is-clamped {
  max-height: 260px;
  overflow: hidden;
  position: relative;
  /* Fade out the bottom of clamped text */
  -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
}

.desc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.85rem;
  padding: 0.45rem 0.9rem;
  background: var(--btn-ghost-bg);
  border: 1px solid var(--btn-ghost-border);
  border-radius: 999px;
  color: var(--primary-text);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
}

.desc-toggle:hover {
  background: var(--btn-ghost-hover);
  border-color: var(--primary);
}

.desc-toggle-icon {
  transition: transform 0.25s ease;
}

.desc-toggle-icon.is-open {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .detail-collapsible .detail-body,
  .desc-toggle-icon {
    transition: none;
  }
}

/* Specs table */
.specs-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  max-width: 480px;
}

.spec-row {
  display: flex;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.spec-row:last-child {
  border-bottom: none;
}

.spec-label {
  width: 140px;
  flex-shrink: 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.spec-value {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Related */
.related-section {
  margin-bottom: 2rem;
}

.related-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.related-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--primary-text);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.25rem;
}

.related-card {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.related-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px var(--shadow-card-strong);
}

.related-thumb {
  display: block;
  aspect-ratio: 4 / 3;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.related-thumb img {
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

.related-body {
  padding: 0.9rem;
}

.related-body h3 {
  font-size: 0.92rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-price {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
}

/* States */
.state-box {
  text-align: center;
  padding: 4rem 1.5rem;
}

.state-box h2 {
  margin: 0 0 0.5rem;
}

.state-box p {
  color: var(--text-muted);
  margin: 0 0 1.5rem;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-muted);
  margin: 0 auto 1.25rem;
}

/* Skeleton */
.pdp-skeleton {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

.skel-gallery {
  aspect-ratio: 4 / 3;
  border-radius: 16px;
}

.skel-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}

.skeleton-box,
.skeleton-line {
  background: linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
  border-radius: 8px;
}

.skeleton-line {
  height: 20px;
}

.skeleton-line.w60 { width: 60%; }
.skeleton-line.w80 { width: 80%; height: 32px; }
.skeleton-line.w40 { width: 40%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-box,
  .skeleton-line { animation: none; }
}

/* Responsive */
@media (max-width: 860px) {
  .pdp-grid,
  .pdp-skeleton {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}

@media (max-width: 540px) {
  .actions {
    width: 100%;
  }
  .actions-buy {
    flex: 1;
    justify-content: center;
  }
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
