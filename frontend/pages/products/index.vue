<template>
  <div class="catalog">
    <TheHeader />

    <main class="catalog-main">
      <div class="catalog-container">
        <!-- Page heading -->
        <header class="catalog-head">
          <nav class="crumbs" aria-label="Breadcrumb">
            <NuxtLink to="/">Beranda</NuxtLink>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{{ activeCategoryName || 'Katalog' }}</span>
          </nav>
          <h1 class="catalog-title">{{ activeCategoryName || 'Jelajahi Produk Digital' }}</h1>
          <p class="catalog-subtitle">
            Source code, ebook, dan layanan web pilihan untuk mempercepat proyek Anda.
          </p>
        </header>

        <!-- Toolbar: result count + sort + mobile filter trigger -->
        <div class="toolbar">
          <p class="toolbar-count" aria-live="polite">
            <template v-if="loading">Memuat produk…</template>
            <template v-else-if="totalItems === 0">Tidak ada produk</template>
            <template v-else>
              <strong>{{ products.length }}</strong> dari {{ totalItems }} produk
            </template>
          </p>

          <div class="toolbar-actions">
            <button
              type="button"
              class="filter-trigger"
              :aria-expanded="sheetOpen"
              aria-controls="catalog-filter-sheet"
              @click="openSheet"
            >
              <AppIcon name="sliders" :size="17" />
              Filter
              <span v-if="activeFilterCount" class="filter-badge">{{ activeFilterCount }}</span>
            </button>

            <label class="sort">
              <span class="sort-label">Urutkan</span>
              <span class="sort-wrap">
                <select
                  class="sort-select"
                  :value="sort"
                  aria-label="Urutkan produk"
                  @change="onSortChange(($event.target as HTMLSelectElement).value as SortOption)"
                >
                  <option value="latest">Terbaru</option>
                  <option value="price-asc">Harga terendah</option>
                  <option value="price-desc">Harga tertinggi</option>
                </select>
                <AppIcon name="chevronDown" :size="15" class="sort-chevron" aria-hidden="true" />
              </span>
            </label>
          </div>
        </div>

        <div class="catalog-layout">
          <!-- Desktop sidebar -->
          <aside class="catalog-sidebar" aria-label="Filter produk">
            <div class="sidebar-card">
              <CatalogFilterPanel
                id-prefix="sidebar"
                :category="category"
                :search="search"
                :price-max="priceMax"
                :price-ceiling="PRICE_CEILING"
                :has-active-filters="hasActiveFilters"
                :category-options="categoryOptions"
                @update:category="onCategoryChange"
                @update:search="onSearchInput"
                @update:price-max="onPriceInput"
                @reset="resetFilters"
              />
            </div>
          </aside>

          <!-- Results -->
          <section class="catalog-results" aria-label="Daftar produk">
            <ActiveFilterChips :chips="activeChips" @remove="onRemoveChip" @clear="resetFilters" />

            <!-- Loading skeletons -->
            <div v-if="loading" class="product-grid">
              <ProductCard v-for="n in 6" :key="`sk-${n}`" :product="null" />
            </div>

            <!-- Error -->
            <div v-else-if="error" class="state-box" role="alert">
              <span class="state-icon">
                <AppIcon name="close" :size="28" />
              </span>
              <h2>Gagal memuat produk</h2>
              <p>{{ error }}</p>
              <button type="button" class="btn btn-primary" @click="loadProducts()">Coba Lagi</button>
            </div>

            <!-- Empty -->
            <div v-else-if="products.length === 0" class="state-box">
              <span class="state-icon">
                <AppIcon name="search" :size="28" />
              </span>
              <h2>Tidak ada produk yang cocok</h2>
              <p v-if="hasActiveFilters">
                Coba longgarkan filter Anda — atau hapus semuanya untuk melihat seluruh katalog.
              </p>
              <p v-else>Katalog sedang kami siapkan. Cek kembali sebentar lagi.</p>
              <button
                v-if="hasActiveFilters"
                type="button"
                class="btn btn-primary"
                @click="resetFilters"
              >
                Hapus semua filter
              </button>
              <NuxtLink v-else to="/" class="btn btn-primary">Kembali ke Beranda</NuxtLink>
            </div>

            <!-- Grid -->
            <template v-else>
              <div class="product-grid">
                <ProductCard
                  v-for="product in products"
                  :key="product.id"
                  :product="product"
                  :badge="categoryLabel(product)"
                />
              </div>

              <div v-if="hasMore" class="load-more">
                <button
                  type="button"
                  class="btn btn-outline"
                  :disabled="loadingMore"
                  @click="loadMore"
                >
                  <span v-if="loadingMore" class="spinner" aria-hidden="true" />
                  {{ loadingMore ? 'Memuat…' : 'Muat Lebih Banyak' }}
                </button>
                <p class="load-more-hint">
                  Menampilkan {{ products.length }} dari {{ totalItems }} produk
                </p>
              </div>
            </template>
          </section>
        </div>
      </div>
    </main>

    <!-- Mobile filter sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="sheetOpen" class="sheet-root">
          <div class="sheet-backdrop" @click="closeSheet" />
          <div
            id="catalog-filter-sheet"
            class="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filter produk"
          >
            <div class="sheet-handle" aria-hidden="true" />
            <div class="sheet-head">
              <h2 class="sheet-title">Filter</h2>
              <button type="button" class="sheet-close" aria-label="Tutup filter" @click="closeSheet">
                <AppIcon name="close" :size="18" />
              </button>
            </div>

            <div class="sheet-body">
              <CatalogFilterPanel
                id-prefix="sheet"
                :category="category"
                :search="search"
                :price-max="priceMax"
                :price-ceiling="PRICE_CEILING"
                :has-active-filters="hasActiveFilters"
                :category-options="categoryOptions"
                @update:category="onCategoryChange"
                @update:search="onSearchInput"
                @update:price-max="onPriceInput"
                @reset="resetFilters"
              />
            </div>

            <div class="sheet-foot">
              <button type="button" class="btn btn-primary btn-full" @click="closeSheet">
                Terapkan
                <span v-if="totalItems > 0" class="sheet-count">({{ totalItems }})</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useShop } from '~/composables/useShop'
import { useProductFilters, PRICE_CEILING, type SortOption } from '~/composables/useProductFilters'
import { GET_COLLECTIONS } from '~/graphql/queries/collections'
import type { CategoryOption } from '~/components/CatalogFilterPanel.vue'
import type { FilterChip, FilterChipKey } from '~/components/ActiveFilterChips.vue'
import { formatPriceIDR } from '~/utils/format'

useHead({
  title: 'Katalog Produk - NgopiCode Digital Store',
  meta: [
    {
      name: 'description',
      content:
        'Jelajahi katalog source code, ebook, dan layanan web premium untuk developer Indonesia. Beli tanpa daftar akun.',
    },
  ],
})

interface Collection {
  id: string
  name: string
  slug: string
  productVariantCount?: number
}

/** Products per fetch. "Load more" grows the window by this amount. */
const PAGE_SIZE = 9

const route = useRoute()
const { products, totalItems, loading, loadingMore, error, fetchProducts } = useShop()
const {
  category,
  search,
  page,
  sort,
  priceMax,
  hasActiveFilters,
  setCategory,
  setSearch,
  setPage,
  setSort,
  setPriceMax,
  clearFilters,
} = useProductFilters({ pageSize: PAGE_SIZE })

const collections = ref<Collection[]>([])
const sheetOpen = ref(false)

/**
 * The catalog is scoped to the real product collections.
 *
 * This is how uncategorized test data (seeded `mockup-*` products) stays out of
 * shopper-facing results: the search API supports facet *inclusion* only, so
 * scoping to real collections is the supported, server-side, count-accurate
 * way to exclude them.
 */
const CATALOG_COLLECTION_SLUGS = ['source-code', 'ebooks', 'services']

const activeCategoryName = computed(
  () => collections.value.find((c) => c.slug === category.value)?.name ?? '',
)

const hasMore = computed(() => products.value.length < totalItems.value)

// ---------------------------------------------------------------- filter panel
const categoryOptions = computed<CategoryOption[]>(() => [
  { value: '', label: 'Semua Produk' },
  ...collections.value.map((c) => ({
    value: c.slug,
    label: c.name,
    count: c.productVariantCount ?? null,
  })),
])

const activeChips = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = []
  if (category.value) {
    chips.push({ key: 'category', label: activeCategoryName.value || category.value })
  }
  if (search.value.trim().length >= 2) {
    chips.push({ key: 'search', label: `"${search.value.trim()}"` })
  }
  if (priceMax.value < PRICE_CEILING) {
    chips.push({ key: 'priceMax', label: `≤ ${formatPriceIDR(priceMax.value)}` })
  }
  return chips
})

const activeFilterCount = computed(() => activeChips.value.length)

// ---------------------------------------------------------------- data loading
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

/**
 * Fetches the visible window. `page` counts *loaded pages*, so "load more"
 * simply enlarges the window — which keeps the client-side price filter exact.
 */
async function loadProducts(options?: { append?: boolean }) {
  await fetchProducts({
    categorySlug: category.value || undefined,
    collectionSlugs: CATALOG_COLLECTION_SLUGS,
    search: search.value.length >= 2 ? search.value : undefined,
    sort: sort.value,
    priceMax: priceMax.value,
    take: PAGE_SIZE * page.value,
    skip: 0,
    append: options?.append ?? false,
  })
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  setPage(page.value + 1)
  loadProducts({ append: true })
}

// ---------------------------------------------------------------- interactions
let searchDebounce: ReturnType<typeof setTimeout> | null = null
let priceDebounce: ReturnType<typeof setTimeout> | null = null

function onCategoryChange(slug: string) {
  setCategory(slug)
  loadProducts()
}

function onSearchInput(value: string) {
  search.value = value
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    setSearch(value)
    loadProducts()
  }, 300)
}

function onPriceInput(value: number) {
  priceMax.value = value
  if (priceDebounce) clearTimeout(priceDebounce)
  priceDebounce = setTimeout(() => {
    setPriceMax(value)
    loadProducts()
  }, 300)
}

function onSortChange(value: SortOption) {
  setSort(value)
  loadProducts()
}

function onRemoveChip(key: FilterChipKey) {
  if (key === 'category') setCategory('')
  else if (key === 'search') setSearch('')
  else setPriceMax(PRICE_CEILING)
  loadProducts()
}

function resetFilters() {
  clearFilters()
  loadProducts()
}

function categoryLabel(product: { collectionIds?: string[] }): string | null {
  const ids = product.collectionIds ?? []
  if (!ids.length) return null
  const matched = collections.value.find((c) => String(c.id) === String(ids[0]))
  return matched?.name ?? null
}

// ---------------------------------------------------------------- mobile sheet
function openSheet() {
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && sheetOpen.value) closeSheet()
}

// ---------------------------------------------------------------- lifecycle
onMounted(async () => {
  await Promise.all([loadCollections(), loadProducts()])
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (searchDebounce) clearTimeout(searchDebounce)
  if (priceDebounce) clearTimeout(priceDebounce)
})

/**
 * Keep state in sync with the URL so browser back/forward restores the previous
 * filter combination instead of leaving stale results on screen.
 */
watch(
  () => route.query,
  (query) => {
    const nextCategory = (query.category as string) || ''
    const nextSearch = (query.search as string) || ''
    const nextSort = (query.sort as SortOption) || 'latest'
    const nextMax = query.max ? Number(query.max) : PRICE_CEILING
    const nextPage = Number(query.page) || 1

    const changed =
      nextCategory !== category.value ||
      nextSearch !== search.value ||
      nextSort !== sort.value ||
      nextMax !== priceMax.value ||
      nextPage !== page.value

    if (!changed) return

    category.value = nextCategory
    search.value = nextSearch
    sort.value = nextSort
    priceMax.value = nextMax
    page.value = nextPage
    loadProducts()
  },
)
</script>

<style scoped>
.catalog {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.catalog-main {
  flex: 1;
  padding: 2rem 1.25rem 4rem;
}

.catalog-container {
  max-width: 1200px;
  margin: 0 auto;
  min-width: 0;
}

/* ============ Head ============ */
.catalog-head {
  margin-bottom: 1.5rem;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.crumbs a {
  color: var(--text-muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--primary-text);
  text-decoration: underline;
}

.catalog-title {
  font-size: clamp(1.5rem, 3.4vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
  overflow-wrap: break-word;
}

.catalog-subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
  margin: 0;
  line-height: 1.55;
  max-width: 62ch;
}

/* ============ Toolbar ============ */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.toolbar-count {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.toolbar-count strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-trigger {
  display: none; /* desktop uses the sidebar */
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-badge {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Sort */
.sort {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.sort-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.sort-select {
  appearance: none;
  min-height: 44px;
  padding: 0.5rem 2.1rem 0.5rem 0.85rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.sort-chevron {
  position: absolute;
  right: 0.7rem;
  pointer-events: none;
  color: var(--text-muted);
}

/* ============ Layout ============ */
.catalog-layout {
  display: grid;
  grid-template-columns: 264px 1fr;
  gap: 1.75rem;
  align-items: start;
}

.catalog-layout > * {
  min-width: 0;
}

.sidebar-card {
  position: sticky;
  top: 88px;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
}

/* ============ Grid ============ */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

/* ============ Load more ============ */
.load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  margin-top: 2rem;
}

.load-more-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============ States ============ */
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
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin-bottom: 0.3rem;
}

.state-box h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.state-box p {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.55;
  max-width: 42ch;
}

/* ============ Buttons ============ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-outline {
  background: var(--surface);
  border-color: var(--border-strong);
  color: var(--text);
  min-width: 220px;
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary-text);
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
}

/* ============ Mobile sheet ============ */
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 18px 18px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.28);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: var(--border-strong);
  margin: 0.6rem auto 0;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.25rem 0.5rem;
  border-bottom: 1px solid var(--border);
}

.sheet-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.sheet-close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.sheet-close:hover {
  background: var(--surface-2);
  color: var(--text);
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.sheet-foot {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
}

.sheet-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

/* Sheet transition */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.22s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

/* ============ Focus visibility ============ */
.filter-trigger:focus-visible,
.sort-select:focus-visible,
.sheet-close:focus-visible,
.btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ============ Responsive ============ */
@media (max-width: 900px) {
  .catalog-layout {
    grid-template-columns: 1fr;
  }

  .catalog-sidebar {
    display: none;
  }

  .filter-trigger {
    display: inline-flex;
  }

  .sidebar-card {
    position: static;
  }
}

@media (max-width: 640px) {
  .catalog-main {
    padding: 1.5rem 1rem 3rem;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .toolbar-actions {
    justify-content: space-between;
  }

  .sort {
    flex: 1;
  }

  .sort-select {
    width: 100%;
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .btn-outline {
    min-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet,
  .sheet-leave-active .sheet {
    transition: none;
  }

  .spinner {
    animation: none;
  }

  .btn {
    transition: none;
  }
}
</style>
