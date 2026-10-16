<template>
  <div class="pdp">
    <TheHeader />

    <main class="pdp-main">
      <!-- Breadcrumb -->
      <nav class="crumbs" aria-label="Breadcrumb">
        <NuxtLink to="/">Beranda</NuxtLink>
        <span class="crumb-sep" aria-hidden="true">/</span>
        <NuxtLink to="/products">Katalog</NuxtLink>
        <span class="crumb-sep" aria-hidden="true">/</span>
        <span class="crumb-current" aria-current="page">{{ product?.name ?? 'Produk' }}</span>
      </nav>

      <!-- Loading -->
      <div v-if="loading" class="pdp-skeleton" aria-hidden="true">
        <div class="skel-gallery skeleton-box" />
        <div class="skel-info">
          <div class="skeleton-line w30" />
          <div class="skeleton-line w80 tall" />
          <div class="skeleton-line w40" />
          <div class="skeleton-line w100" />
          <div class="skeleton-line w100" />
          <div class="skeleton-line w60" />
        </div>
      </div>

      <!-- Load failed (API/network error — distinct from "not found") -->
      <div v-else-if="loadError" class="state-box" role="alert">
        <div class="state-icon state-icon-error"><AppIcon name="refreshCw" :size="32" /></div>
        <h2>Gagal memuat produk</h2>
        <p>Terjadi masalah saat menghubungi server. Silakan coba lagi.</p>
        <button class="btn btn-primary" type="button" @click="loadProduct">Coba Lagi</button>
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
        <div class="pdp-hero">
          <!-- Gallery -->
          <div class="gallery">
            <div
              class="gallery-main"
              role="button"
              tabindex="0"
              :aria-label="`Perbesar gambar ${product.name}`"
              @click="openLightbox(activeIndex)"
              @keydown.enter="openLightbox(activeIndex)"
              @keydown.space.prevent="openLightbox(activeIndex)"
            >
              <img
                v-if="galleryImages.length"
                :src="galleryImages[activeIndex].preview"
                :alt="product.name"
                class="gallery-img"
                decoding="async"
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
                :aria-current="idx === activeIndex"
                @click="activeIndex = idx"
              >
                <img :src="img.preview" :alt="`${product.name} - gambar ${idx + 1}`" loading="lazy" />
              </button>
            </div>
          </div>

          <!-- Buy box -->
          <div ref="buyBoxRef" class="buybox">
            <p class="eyebrow">{{ badgeLabel }}</p>
            <h1 class="info-name">{{ product.name }}</h1>

            <!-- License tier selector -->
            <div v-if="showVariantSelector" class="variant-select">
              <span id="variant-select-label" class="variant-select-label">Pilih Lisensi</span>
              <div class="variant-options" role="radiogroup" aria-labelledby="variant-select-label">
                <button
                  v-for="opt in licenseOptions"
                  :key="opt.variantId"
                  type="button"
                  role="radio"
                  class="variant-option"
                  :class="{ active: selectedVariantId === opt.variantId, unavailable: !opt.purchasable }"
                  :aria-checked="selectedVariantId === opt.variantId"
                  :disabled="!opt.purchasable"
                  @click="selectVariant(opt.variantId)"
                >
                  <span class="variant-option-name">{{ opt.label }}</span>
                  <span class="variant-option-price">{{ opt.priceLabel }}</span>
                  <span v-if="!opt.purchasable" class="variant-option-note">Belum tersedia</span>
                </button>
              </div>
            </div>

            <div class="price-row">
              <span class="info-price">{{ priceLabel }}</span>
              <span v-if="compareAtPrice" class="price-original">{{ formatPriceIDR(compareAtPrice) }}</span>
              <span v-if="discountPercent" class="discount-badge">Hemat {{ discountPercent }}%</span>
              <span v-if="selectedLicenseLabel" class="license-chip">
                <AppIcon name="tag" :size="14" />
                {{ selectedLicenseLabel }}
              </span>
            </div>

            <p class="info-desc">{{ cleanDescription }}</p>

            <!-- Key features -->
            <ul v-if="features.length" class="features-list">
              <li v-for="feat in features" :key="feat">
                <span class="feat-icon"><AppIcon name="check" :size="14" /></span>
                <span>{{ feat }}</span>
              </li>
            </ul>

            <!-- Selected tier cannot be delivered (no file uploaded) -->
            <div v-if="!selectedPurchasable" class="unavailable-banner" role="status">
              <AppIcon name="clock" :size="20" />
              <div class="unavailable-content">
                <span class="unavailable-title">Varian ini belum tersedia</span>
                <span class="unavailable-desc">Pilih lisensi lain, atau tanya kami via WhatsApp.</span>
              </div>
            </div>

            <!-- Already owned (this exact tier) -->
            <div v-else-if="alreadyOwned" class="owned-banner">
              <div class="owned-icon"><AppIcon name="checkCircle" :size="20" /></div>
              <div class="owned-content">
                <span class="owned-title">Kamu sudah memiliki lisensi ini</span>
                <span class="owned-desc">Akses produk di Pustaka Digital kamu.</span>
              </div>
              <NuxtLink to="/account" class="btn btn-primary btn-sm owned-link">Lihat di Pustaka</NuxtLink>
            </div>

            <!-- Actions -->
            <div v-else class="actions">
              <button
                class="btn btn-primary btn-buy"
                type="button"
                :disabled="!selectedPurchasable"
                @click="onBuyNow"
              >
                <AppIcon name="shoppingBag" :size="20" />
                Beli Sekarang
              </button>
              <button
                class="btn-wish"
                :class="{ wishlisted: productInWishlist }"
                type="button"
                :aria-label="productInWishlist ? 'Hapus dari wishlist' : 'Tambah ke wishlist'"
                :aria-pressed="productInWishlist"
                @click="onWishlist"
              >
                <AppIcon name="heart" :size="20" />
              </button>
            </div>

            <a
              v-if="whatsappUrl"
              :href="whatsappUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="wa-link"
            >
              <AppIcon name="whatsapp" :size="18" />
              <span>Tanya dulu via WhatsApp</span>
            </a>

            <!-- Trust row -->
            <ul class="trust-row">
              <li>
                <AppIcon name="zap" :size="18" />
                <span>Download instan</span>
              </li>
              <li>
                <AppIcon name="shield" :size="18" />
                <span>Pembayaran aman</span>
              </li>
              <li>
                <AppIcon name="refreshCw" :size="18" />
                <span>Update gratis</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- What you get -->
        <section class="included-section" aria-labelledby="included-title">
          <h2 id="included-title" class="section-title">Apa yang kamu dapat</h2>
          <div class="included-grid">
            <article class="included-card">
              <span class="included-icon"><AppIcon name="fileText" :size="20" /></span>
              <div>
                <span class="included-label">Format File</span>
                <span class="included-value">{{ specs.format }}</span>
              </div>
            </article>
            <article v-if="specs.size" class="included-card">
              <span class="included-icon"><AppIcon name="package" :size="20" /></span>
              <div>
                <span class="included-label">Ukuran File</span>
                <span class="included-value">{{ specs.size }}</span>
              </div>
            </article>
            <article v-if="specs.downloadLimit" class="included-card">
              <span class="included-icon"><AppIcon name="download" :size="20" /></span>
              <div>
                <span class="included-label">Batas Unduh</span>
                <span class="included-value">{{ specs.downloadLimit }}</span>
              </div>
            </article>
            <article class="included-card">
              <span class="included-icon"><AppIcon name="tag" :size="20" /></span>
              <div>
                <span class="included-label">Lisensi</span>
                <span class="included-value">{{ specs.license }}</span>
              </div>
            </article>
            <article class="included-card">
              <span class="included-icon"><AppIcon name="layers" :size="20" /></span>
              <div>
                <span class="included-label">Tipe</span>
                <span class="included-value">{{ specs.type }}</span>
              </div>
            </article>
            <article class="included-card">
              <span class="included-icon"><AppIcon name="zap" :size="20" /></span>
              <div>
                <span class="included-label">Pengiriman</span>
                <span class="included-value">{{ deliveryInfo }}</span>
              </div>
            </article>
          </div>
        </section>

        <!-- Description -->
        <section class="detail-section" aria-labelledby="desc-title">
          <h2 id="desc-title" class="section-title">Deskripsi</h2>
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
        </section>

        <!-- Related products -->
        <section v-if="relatedProducts.length" class="related-section" aria-labelledby="related-title">
          <div class="related-head">
            <h2 id="related-title" class="section-title">Produk Serupa</h2>
            <NuxtLink to="/products" class="view-all">
              Lihat Semua
              <AppIcon name="arrowRight" :size="16" />
            </NuxtLink>
          </div>
          <div class="related-grid">
            <ProductCard v-for="rp in relatedProducts" :key="rp.id" :product="rp" :show-description="false" />
          </div>
        </section>
      </template>
    </main>

    <!-- Sticky mobile buy bar -->
    <transition name="stickybar">
      <div v-if="showStickyBar && product && !alreadyOwned" class="sticky-buy">
        <div class="sticky-info">
          <span class="sticky-name">{{ product.name }}</span>
          <span class="sticky-price">
            {{ priceLabel }}
            <span v-if="compareAtPrice" class="sticky-price-original">{{ formatPriceIDR(compareAtPrice) }}</span>
          </span>
        </div>
        <button
          class="btn btn-primary sticky-cta"
          type="button"
          :disabled="!selectedPurchasable"
          @click="onBuyNow"
        >
          <AppIcon name="shoppingBag" :size="18" />
          {{ selectedPurchasable ? 'Beli' : 'Belum tersedia' }}
        </button>
      </div>
    </transition>

    <TheFooter />

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
            <AppIcon name="arrowLeft" :size="24" />
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
            <AppIcon name="arrowRight" :size="24" />
          </button>
          <div v-if="galleryImages.length > 1" class="lightbox-counter">
            {{ lightboxIndex + 1 }} / {{ galleryImages.length }}
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useShop, type Product } from '~/composables/useShop'
import { useWhatsapp } from '~/composables/useWhatsapp'
import { formatPriceIDR, formatFileSize, formatMimeType, stripHtml } from '~/utils/format'
import {
  getVariantOptionCode,
  getVariantOptionLabel,
  isVariantPurchasable,
  pickVariant,
  hasMultipleVariants,
  productRequiresFile,
} from '~/utils/variants'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

const { getProductBySlug, products, fetchProducts } = useShop()
const { whatsappNumber, fetchWhatsappNumber, buildWhatsappUrl } = useWhatsapp()

const product = ref<Product | null>(null)
const loading = ref(true)
/** True when the product request failed (API/network) rather than 404'd. */
const loadError = ref(false)
const relatedProducts = ref<Product[]>([])
const activeIndex = ref(0)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

// Collapsible description state
const descBody = ref<HTMLElement | null>(null)
const descExpanded = ref(false)
const descClampable = ref(false)
const DESC_CLAMP_HEIGHT = 260 // px — collapsed max-height threshold

// Sticky mobile buy bar
const buyBoxRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)
let observer: IntersectionObserver | null = null

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
  const price = selectedVariant.value?.price
  return price != null ? formatPriceIDR(price) : 'Hubungi kami'
})

const variants = computed(() => product.value?.variants ?? [])

/**
 * Whether this product must have an uploaded file to be sellable.
 * False for services (jasa), which are delivered by work and have no file —
 * requiring one made every service tier permanently unsellable.
 */
const requiresFile = computed(() => productRequiresFile(product.value?.facetValues))

/** Currently selected variant (license tier). */
const selectedVariantId = ref<string | null>(null)
const selectedVariant = computed(
  () => variants.value.find((v) => v.id === selectedVariantId.value) ?? null,
)

/** True when the product offers more than one tier to choose from. */
const showVariantSelector = computed(() => hasMultipleVariants(variants.value))

/** Radio-card options for the tier selector. */
const licenseOptions = computed(() =>
  variants.value.map((v) => ({
    variantId: v.id,
    label: getVariantOptionLabel(v) ?? v.name,
    priceLabel: formatPriceIDR(v.price),
    purchasable: isVariantPurchasable(v, { requiresFile: requiresFile.value }),
  })),
)

const selectedLicenseLabel = computed(() => getVariantOptionLabel(selectedVariant.value))

/**
 * Whether the selected variant can actually be delivered.
 * A digital variant with no uploaded file must never be sold — the order would
 * fulfil with zero downloads. Services are exempt (see `requiresFile`).
 */
const selectedPurchasable = computed(() =>
  isVariantPurchasable(selectedVariant.value, { requiresFile: requiresFile.value }),
)

function selectVariant(variantId: string) {
  selectedVariantId.value = variantId
  // Keep the selection shareable/bookmarkable, e.g. ?option=standar
  const code = getVariantOptionCode(variants.value.find((v) => v.id === variantId))
  if (code && import.meta.client) {
    router.replace({ query: { ...route.query, option: code } })
  }
}

/**
 * Compare-at price. Only surfaced when the admin set an originalPrice that is
 * strictly higher than the actual price — otherwise it is meaningless and the
 * UI stays clean (no dead strikethrough).
 */
const compareAtPrice = computed(() => {
  const variant = selectedVariant.value
  const original = variant?.customFields?.originalPrice
  if (!variant || original == null) return null
  return original > variant.price ? original : null
})

const discountPercent = computed(() => {
  const variant = selectedVariant.value
  if (!compareAtPrice.value || !variant?.price) return null
  return Math.round(((compareAtPrice.value - variant.price) / compareAtPrice.value) * 100)
})

// Real, shop-facing file metadata (size / format / download limits)
const fileInfo = computed(() => selectedVariant.value?.digitalProductInfo ?? null)

const fileFormatLabel = computed(() => {
  return formatMimeType(fileInfo.value?.mimeType)
    || product.value?.customFields?.fileFormat
    || 'ZIP Archive'
})

const fileSizeLabel = computed(() => formatFileSize(fileInfo.value?.fileSize))

const downloadLimitLabel = computed(() => {
  const info = fileInfo.value
  if (!info) return ''
  // 999 is the "unlimited" sentinel written by the admin uploader.
  return info.maxDownloadsPerOrder >= 999
    ? 'Tanpa batas'
    : `${info.maxDownloadsPerOrder}× unduh`
})

const cleanDescription = computed(() => {
  // Prefer the curated short description; otherwise derive plain text from the
  // rich-text description. Either way strip markup/entities — the field is
  // edited in a rich-text editor and may contain HTML in both cases.
  const short = product.value?.customFields?.shortDescription
  if (short) return stripHtml(short)
  return stripHtml(product.value?.description)
})

// Dynamic features from custom field (one per line), with fallback
const features = computed(() => {
  const raw = product.value?.customFields?.keyFeatures
  if (raw) {
    return raw.split('\n').map((f: string) => f.trim()).filter(Boolean).slice(0, 5)
  }
  return ['Arsitektur Bersih', 'Fully Responsive', 'Dukungan Dark Mode', 'Dokumentasi Lengkap']
})

// Dynamic delivery info from custom field, with fallback
const deliveryInfo = computed(() => {
  return product.value?.customFields?.deliveryInfo
    || 'Download instan, update seumur hidup, lisensi personal & komersial.'
})

// Honest product specs — sourced from real custom fields + real file metadata
const specs = computed(() => {
  const cf = product.value?.customFields
  return {
    type: cf?.productType || 'Source Code',
    format: fileFormatLabel.value,
    size: fileSizeLabel.value,
    downloadLimit: downloadLimitLabel.value,
    // License now comes from the selected variant; the product-level custom
    // field is only a fallback for products without license tiers.
    license: selectedLicenseLabel.value || cf?.licenseType || 'Personal & Komersial',
  }
})

// Badge label from custom field
const badgeLabel = computed(() => {
  return (product.value?.customFields?.productType || 'SOURCE CODE').toUpperCase()
})

// Wishlist state
const { init: initWishlist, isInWishlist } = useWishlist()
if (import.meta.client) { initWishlist() }
const productInWishlist = computed(() => product.value ? isInWishlist(product.value.id) : false)

// Owned products state (check if user already purchased this variant)
const { isLoggedIn: authLoggedIn } = useAuth()
const { fetchOwnedProducts, isVariantOwned } = useOwnedProducts()

// Check if product is repeatable (service/jasa) based on Facet "purchase-rule"
const isRepeatable = computed(() => {
  if (!product.value?.facetValues) return false
  return product.value.facetValues.some(
    (fv) => fv.code === 'repeatable' || (fv.facet?.code === 'purchase-rule' && fv.code === 'repeatable')
  )
})

/**
 * "Already owned" is evaluated per VARIANT, not per product.
 * Owning the Personal tier must not hide the ability to buy Extended.
 */
const alreadyOwned = computed(() => {
  if (isRepeatable.value) return false
  return isVariantOwned(selectedVariant.value?.id)
})

// WhatsApp URL with pre-filled message
const whatsappUrl = computed(() => {
  if (!whatsappNumber.value || !product.value) return ''
  const productUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://ngopicode.com/products/${slug.value}`
  return buildWhatsappUrl(product.value.name, productUrl)
})

/**
 * Guest checkout: no login required.
 *
 * The buy page collects the buyer's details (email, name, WhatsApp) inline and
 * fulfilment is delivered through an emailed/WhatsApp magic link, so a
 * logged-out visitor can complete a purchase. Redirecting to /auth here would
 * block the entire guest flow.
 */
function onBuyNow() {
  if (!product.value) return
  if (!selectedPurchasable.value) return
  // Carry the chosen tier through to checkout (?option=standar).
  const code = getVariantOptionCode(selectedVariant.value)
  const query = code ? `?option=${encodeURIComponent(code)}` : ''
  navigateTo(`/buy/${product.value.slug}${query}`)
}

function onWishlist() {
  if (!product.value) return

  const { init, toggleWishlist } = useWishlist()
  init()

  // Guests keep a local-only wishlist (see useWishlist) which syncs to the
  // server once they log in, so no login is required to use it.
  const variant = selectedVariant.value ?? product.value.variants?.[0]
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

useHead({
  title: computed(() =>
    product.value
      ? `${product.value.name} - NgopiCode`
      : 'Produk - NgopiCode',
  ),
})

/**
 * Fetch related products from the same collection(s) as the current product,
 * falling back to the latest products when the product has no collection.
 * Uses collectionSlugs so recommendations are genuinely related, not random.
 */
async function loadRelated() {
  const collectionSlugs = product.value?.collections
    ?.map((c) => c.slug)
    .filter(Boolean) as string[] | undefined

  if (collectionSlugs && collectionSlugs.length) {
    await fetchProducts({ collectionSlugs, take: 5 })
  } else {
    await fetchProducts({ take: 4 })
  }

  relatedProducts.value = products.value
    .filter((p) => p.slug !== slug.value)
    .slice(0, 4)
}

/**
 * Load the product for the current slug, then hydrate the page.
 *
 * Distinguishes "not found" (resolves to null) from a failed request (throws):
 * a failed request shows a retry state instead of a misleading 404.
 */
async function loadProduct() {
  loading.value = true
  loadError.value = false
  product.value = null
  showStickyBar.value = false

  try {
    product.value = await getProductBySlug(slug.value)
  } catch {
    loadError.value = true
    loading.value = false
    return
  }

  loading.value = false

  // Resolve the initial tier: honour ?option=standar, otherwise fall back to
  // the first purchasable variant. `license` is the legacy param name.
  const preferred =
    (route.query.option as string | undefined) ??
    (route.query.license as string | undefined) ??
    null
  selectedVariantId.value =
    pickVariant(variants.value, {
      preferredOptionCode: preferred,
      requiresFile: requiresFile.value,
    })?.id ?? null

  // Measure description once rendered to decide if the toggle is needed
  await nextTick()
  measureDescription()

  // Fetch contact info and related products in parallel
  await Promise.all([fetchWhatsappNumber(), loadRelated()])

  if (authLoggedIn.value) {
    await fetchOwnedProducts()
  }

  // Reveal the sticky buy bar once the buy box scrolls out of view (mobile).
  // The buy box only exists after a successful load, so set this up here.
  await nextTick()
  setupStickyObserver()
}

function setupStickyObserver() {
  if (!import.meta.client || !buyBoxRef.value) return
  observer?.disconnect()
  observer = new IntersectionObserver(
    ([entry]) => {
      showStickyBar.value = !entry.isIntersecting && entry.boundingClientRect.top < 0
    },
    { rootMargin: '-80px 0px 0px 0px', threshold: 0 },
  )
  observer.observe(buyBoxRef.value)
}

onMounted(loadProduct)

// Keep the selected tier in sync with browser back/forward and shared links.
watch(
  [() => route.query.option, () => route.query.license],
  ([option, license]) => {
    if (!product.value) return
    const code = (option as string | undefined) ?? (license as string | undefined) ?? null
    const next = pickVariant(variants.value, {
      preferredOptionCode: code,
      requiresFile: requiresFile.value,
    })
    if (next && next.id !== selectedVariantId.value) {
      selectedVariantId.value = next.id
    }
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  if (import.meta.client) document.body.style.overflow = ''
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
  padding: 1.5rem 1.25rem 4rem;
  overflow-x: hidden;
}

/* Breadcrumb */
.crumbs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}

.crumbs a {
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 4px;
}

.crumbs a:hover {
  color: var(--primary-text);
}

.crumb-sep {
  color: var(--border-strong);
}

.crumb-current {
  color: var(--text);
  font-weight: 500;
  max-width: 40ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Hero grid */
.pdp-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: start;
  margin-bottom: 3.5rem;
}

/* Gallery */
.gallery {
  min-width: 0;
  position: sticky;
  top: 88px;
}

.gallery-main {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  cursor: zoom-in;
}

.gallery-main:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
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
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-main:hover .gallery-zoom,
.gallery-main:focus-visible .gallery-zoom {
  opacity: 1;
}

/* Thumbnails */
.gallery-thumbs {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.85rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  max-width: 100%;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.thumb-btn {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  scroll-snap-align: start;
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

.thumb-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.thumb-btn.active {
  border-color: var(--primary);
}

/* Buy box */
.buybox {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  color: var(--primary-text);
}

.info-name {
  font-size: clamp(1.6rem, 3.6vw, 2.15rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.18;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* License tier selector */
.variant-select {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.variant-select-label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.variant-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.6rem;
}

.variant-option {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 1rem;
  min-height: 44px;
  text-align: left;
  background: var(--surface);
  border: 1.5px solid var(--border-strong);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}

.variant-option:hover:not(:disabled) {
  border-color: var(--primary);
}

.variant-option.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  box-shadow: 0 0 0 1px var(--primary);
}

.variant-option:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.variant-option:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.variant-option-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
}

.variant-option.active .variant-option-name {
  color: var(--primary-text);
}

.variant-option-price {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
}

.variant-option-note {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* Unavailable tier notice */
.unavailable-banner {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.15rem;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  color: var(--text-muted);
}

.unavailable-content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.unavailable-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
}

.unavailable-desc {
  font-size: 0.8rem;
}

.info-price {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--primary-text);
  margin: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.license-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-text);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Compare-at (original) price — shown only when the product is discounted */
.price-original {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

.discount-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: #e74c6f;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

/* Same promotion treatment on the sticky bar */
.sticky-price-original {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: line-through;
  margin-left: 0.4rem;
  font-variant-numeric: tabular-nums;
}

.info-desc {
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0;
  font-size: 0.98rem;
}

/* Features */
.features-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 1rem;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.92rem;
  color: var(--text);
}

.feat-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-text);
  flex-shrink: 0;
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-buy {
  flex: 1;
  min-height: 52px;
  justify-content: center;
  font-size: 1rem;
}

.btn-wish {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.15s;
  flex-shrink: 0;
}

.btn-wish:hover {
  background: var(--btn-ghost-hover);
  color: #e74c6f;
  border-color: #e74c6f;
}

.btn-wish:active {
  transform: scale(0.95);
}

.btn-wish:focus-visible,
.wa-link:focus-visible,
.desc-toggle:focus-visible,
.view-all:focus-visible,
.thumb-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.btn-wish.wishlisted {
  background: #fef2f2;
  color: #e74c6f;
  border-color: #e74c6f;
}

.btn-wish.wishlisted svg {
  fill: #e74c6f;
}

[data-theme='dark'] .btn-wish.wishlisted {
  background: rgba(231, 76, 111, 0.12);
}

/* WhatsApp link (secondary, not competing with CTA) */
.wa-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #25D366;
  text-decoration: none;
  border-radius: 10px;
  border: 1px solid var(--border);
  transition: background 0.18s, border-color 0.18s;
}

.wa-link:hover {
  background: var(--surface-2);
  border-color: #25D366;
}

/* Trust row */
.trust-row {
  list-style: none;
  margin: 0;
  padding: 1rem 0 0;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.trust-row li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
}

.trust-row svg {
  color: var(--primary-text);
}

/* Owned banner */
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

/* Section title (shared) */
.section-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
  letter-spacing: -0.01em;
}

/* What you get */
.included-section {
  margin-bottom: 3.5rem;
}

.included-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.included-card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1.1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
}

.included-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-text);
  flex-shrink: 0;
}

.included-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  margin-bottom: 0.2rem;
}

.included-value {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

/* Description */
.detail-section {
  margin-bottom: 3.5rem;
  min-width: 0;
  overflow: hidden;
}

.detail-body {
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 0.98rem;
  max-width: 100%;
  overflow-x: auto;
  overflow-wrap: break-word;
  word-break: break-word;
}

.detail-body :deep(p) {
  margin: 0 0 1rem;
}

.detail-body :deep(h2),
.detail-body :deep(h3) {
  color: var(--text);
}

/* Contain wide HTML tables from rich text editor */
.detail-body :deep(table) {
  display: block;
  overflow-x: auto;
  max-width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  -webkit-overflow-scrolling: touch;
}

.detail-body :deep(td),
.detail-body :deep(th) {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  white-space: nowrap;
}

.detail-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
}

.detail-body :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}

/* Collapsible description */
.detail-collapsible {
  min-width: 0;
}

.detail-collapsible .detail-body {
  transition: max-height 0.3s ease;
}

.detail-collapsible .detail-body.is-clamped {
  max-height: 260px;
  overflow: hidden;
  position: relative;
  -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
}

.desc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.85rem;
  min-height: 44px;
  padding: 0.45rem 1rem;
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

/* Related */
.related-section {
  margin-bottom: 2rem;
}

.related-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.related-head .section-title {
  margin: 0;
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  color: var(--primary-text);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  border-radius: 8px;
}

.view-all:hover {
  text-decoration: underline;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.25rem;
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

.btn-primary:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Sticky mobile buy bar */
.sticky-buy {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-top: 1px solid var(--border);
  box-shadow: 0 -6px 20px var(--shadow-card-strong);
}

.sticky-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sticky-name {
  font-size: 0.82rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticky-price {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
}

.sticky-cta {
  min-height: 44px;
  padding: 0.6rem 1.35rem;
  flex-shrink: 0;
}

.stickybar-enter-active,
.stickybar-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.stickybar-enter-from,
.stickybar-leave-to {
  transform: translateY(100%);
  opacity: 0;
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
  cursor: pointer;
  transition: background 0.18s;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.22);
}

.lightbox-prev { left: 1.25rem; }
.lightbox-next { right: 1.25rem; }

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

.state-icon-error {
  background: rgba(231, 76, 111, 0.12);
  color: #e74c6f;
}

/* Skeleton */
.pdp-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  margin-bottom: 3rem;
}

.skel-gallery {
  aspect-ratio: 4 / 3;
  border-radius: 18px;
}

.skel-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
}

.skeleton-box,
.skeleton-line {
  background: linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
  border-radius: 8px;
}

.skeleton-line {
  height: 18px;
}

.skeleton-line.tall { height: 36px; }
.skeleton-line.w30 { width: 30%; }
.skeleton-line.w40 { width: 40%; }
.skeleton-line.w60 { width: 60%; }
.skeleton-line.w80 { width: 80%; }
.skeleton-line.w100 { width: 100%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .gallery-img,
  .gallery-zoom,
  .thumb-btn,
  .btn-wish,
  .desc-toggle-icon,
  .detail-collapsible .detail-body,
  .skeleton-box,
  .skeleton-line,
  .stickybar-enter-active,
  .stickybar-leave-active {
    transition: none;
    animation: none;
  }
  .gallery-main:hover .gallery-img {
    transform: none;
  }
}

/* Responsive */
@media (max-width: 860px) {
  .pdp-hero,
  .pdp-skeleton {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  /* Gallery no longer sticky on stacked layout */
  .gallery {
    position: static;
  }

  .pdp-main {
    /* Reserve space for the sticky buy bar */
    padding-bottom: 6rem;
  }

  .sticky-buy {
    display: flex;
  }
}

@media (max-width: 560px) {
  .features-list {
    grid-template-columns: 1fr;
  }

  .trust-row {
    gap: 0.35rem;
  }

  .related-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .owned-banner {
    flex-wrap: wrap;
  }

  .owned-link {
    width: 100%;
    text-align: center;
    justify-content: center;
  }
}
</style>
