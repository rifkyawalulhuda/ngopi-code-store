<template>
  <div class="catalog">
    <TheHeader />

    <main class="catalog-main">
      <!-- Page heading -->
      <div class="catalog-head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <NuxtLink to="/">Beranda</NuxtLink>
          <span aria-hidden="true">/</span>
          <span>Katalog</span>
        </nav>
        <h1 class="catalog-title">Jelajahi Produk Digital</h1>
        <p class="catalog-subtitle">
          Source code, ebook, dan layanan web pilihan untuk mempercepat proyek Anda.
        </p>
      </div>

      <!-- Mobile filter toggle -->
      <button
        class="filter-toggle"
        type="button"
        :aria-expanded="mobileFiltersOpen"
        @click="mobileFiltersOpen = !mobileFiltersOpen"
      >
        <AppIcon name="sliders" :size="18" />
        Filter
        <span v-if="hasActiveFilters" class="filter-dot" aria-hidden="true" />
      </button>

      <div class="catalog-layout">
        <!-- Sidebar filters -->
        <aside class="sidebar" :class="{ 'sidebar-open': mobileFiltersOpen }">
          <div class="sidebar-card">
            <div class="sidebar-section">
              <h2 class="sidebar-heading">
                <AppIcon name="grid" :size="16" />
                Kategori
              </h2>
              <ul class="category-list">
                <li>
                  <button
                    type="button"
                    class="category-item"
                    :class="{ active: category === '' }"
                    @click="onCategoryChange('')"
                  >
                    Semua Produk
                  </button>
                </li>
                <li v-for="c in collections" :key="c.id">
                  <button
                    type="button"
                    class="category-item"
                    :class="{ active: category === c.slug }"
                    @click="onCategoryChange(c.slug)"
                  >
                    {{ c.name }}
                  </button>
                </li>
              </ul>
            </div>

            <div class="sidebar-section">
              <h2 class="sidebar-heading">Pencarian</h2>
              <div class="search-field">
                <AppIcon name="search" :size="18" class="search-icon" />
                <input
                  type="text"
                  :value="search"
                  placeholder="Cari produk..."
                  aria-label="Cari produk"
                  @input="onSearchInput"
                />
              </div>
            </div>

            <div class="sidebar-section">
              <h2 class="sidebar-heading">Rentang Harga</h2>
              <div class="price-range">
                <input
                  v-model.number="priceMax"
                  type="range"
                  min="0"
                  :max="PRICE_CEILING"
                  step="50000"
                  aria-label="Harga maksimum"
                  @input="onPriceInput"
                />
                <div class="price-labels">
                  <span>Rp 0</span>
                  <span>{{ priceMax >= PRICE_CEILING ? 'Rp 5jt+' : formatPrice(priceMax) }}</span>
                </div>
              </div>
            </div>

            <button
              v-if="hasActiveFilters || priceMax < PRICE_CEILING"
              type="button"
              class="clear-btn"
              @click="resetFilters"
            >
              Hapus Semua Filter
            </button>
          </div>
        </aside>

        <!-- Results -->
        <section class="results" aria-label="Daftar produk">
          <div class="results-bar">
            <p class="results-count" aria-live="polite">
              <template v-if="!loading">{{ totalItems }} produk ditemukan</template>
              <template v-else>Memuat produk...</template>
            </p>
            <label class="sort-field">
              <span class="sort-label">Urutkan</span>
              <span class="sort-select-wrap">
                <select v-model="sortValue" aria-label="Urutkan produk" @change="onSortChange">
                  <option value="latest">Terbaru</option>
                  <option value="price-asc">Harga: Rendah ke Tinggi</option>
                  <option value="price-desc">Harga: Tinggi ke Rendah</option>
                </select>
                <AppIcon name="chevronDown" :size="16" class="sort-chevron" />
              </span>
            </label>
          </div>

          <!-- Loading skeletons -->
          <div v-if="loading" class="product-grid">
            <ProductCard v-for="n in 6" :key="`sk-${n}`" :product="null" />
          </div>

          <!-- Error -->
          <div v-else-if="error" class="state-box" role="alert">
            <p>{{ error }}</p>
            <button class="btn btn-primary" @click="loadProducts">Coba Lagi</button>
          </div>

          <!-- Empty -->
          <div v-else-if="products.length === 0" class="state-box">
            <div class="state-icon">
              <AppIcon name="search" :size="32" />
            </div>
            <h3>Tidak ada produk ditemukan</h3>
            <p>Coba ubah kata kunci atau hapus sebagian filter Anda.</p>
            <button
              v-if="hasActiveFilters || priceMax < PRICE_CEILING"
              class="btn btn-ghost"
              @click="resetFilters"
            >
              Hapus Filter
            </button>
          </div>

          <!-- Product grid -->
          <div v-else class="product-grid">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
              :badge="categoryLabel(product)"
            />
          </div>

          <!-- Pagination -->
          <nav v-if="totalPages > 1" class="pagination" aria-label="Navigasi halaman">
            <button
              class="page-btn"
              :disabled="page <= 1"
              aria-label="Halaman sebelumnya"
              @click="goToPage(page - 1)"
            >
              Sebelumnya
            </button>
            <span class="page-info">Halaman {{ page }} / {{ totalPages }}</span>
            <button
              class="page-btn"
              :disabled="page >= totalPages"
              aria-label="Halaman berikutnya"
              @click="goToPage(page + 1)"
            >
              Berikutnya
            </button>
          </nav>
        </section>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShop } from '~/composables/useShop'
import { useProductFilters } from '~/composables/useProductFilters'
import { GET_COLLECTIONS } from '~/graphql/queries/collections'
import { formatPriceIDR } from '~/utils/format'

useHead({
  title: 'Katalog Produk - NgopiCode Digital Store',
  meta: [
    {
      name: 'description',
      content: 'Jelajahi katalog source code, ebook, dan layanan web premium untuk developer Indonesia.',
    },
  ],
})

interface Collection {
  id: string
  name: string
  slug: string
}

const PAGE_SIZE = 9
const PRICE_CEILING = 5_000_000

const { products, totalItems, loading, error, fetchProducts } = useShop()
const {
  category,
  search,
  page,
  filterOptions,
  hasActiveFilters,
  setCategory,
  setSearch,
  setPage,
  clearFilters,
} = useProductFilters({ pageSize: PAGE_SIZE })

const collections = ref<Collection[]>([])
const mobileFiltersOpen = ref(false)
const sortValue = ref<'latest' | 'price-asc' | 'price-desc'>('latest')
const priceMax = ref(PRICE_CEILING)

const totalPages = computed(() => Math.ceil(totalItems.value / PAGE_SIZE))

let searchDebounce: ReturnType<typeof setTimeout> | null = null
let priceDebounce: ReturnType<typeof setTimeout> | null = null

async function loadCollections() {
  try {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({ query: GET_COLLECTIONS })
    collections.value = data.collections.items
  } catch {
    collections.value = []
  }
}

async function loadProducts() {
  await fetchProducts({
    ...filterOptions.value,
    sort: sortValue.value,
    priceMax: priceMax.value,
  })
}

function onCategoryChange(slug: string) {
  setCategory(slug)
  mobileFiltersOpen.value = false
  loadProducts()
}

function onSearchInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  search.value = value
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    setSearch(value)
    loadProducts()
  }, 300)
}

function onSortChange() {
  setPage(1)
  loadProducts()
}

function onPriceInput() {
  // Debounced reload; price filtering is applied client-side (DefaultSearchPlugin
  // has no server-side price range). Reset to page 1 on change.
  setPage(1)
  if (priceDebounce) clearTimeout(priceDebounce)
  priceDebounce = setTimeout(() => {
    loadProducts()
  }, 300)
}

function goToPage(newPage: number) {
  setPage(newPage)
  loadProducts()
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetFilters() {
  clearFilters()
  priceMax.value = PRICE_CEILING
  sortValue.value = 'latest'
  mobileFiltersOpen.value = false
  loadProducts()
}

function formatPrice(value: number): string {
  return formatPriceIDR(value)
}

function categoryLabel(product: any): string {
  // Map the product's first assigned collection to its display name.
  // Falls back to a generic "PRODUK" tag when uncategorized.
  const ids: string[] = product.collectionIds || []
  if (ids.length > 0) {
    const matched = collections.value.find((c) => String(c.id) === String(ids[0]))
    if (matched?.name) return matched.name
  }
  return 'PRODUK'
}

onMounted(async () => {
  await Promise.all([loadCollections(), loadProducts()])
})
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
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 3.5rem;
}

/* Heading */
.catalog-head {
  margin-bottom: 1.75rem;
}

.crumbs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.crumbs a {
  color: var(--text-muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--primary-text);
}

.catalog-title {
  font-size: clamp(1.7rem, 4vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
}

.catalog-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 1rem;
  max-width: 540px;
  line-height: 1.55;
}

/* Mobile filter toggle */
.filter-toggle {
  display: none;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.filter-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

/* Layout */
.catalog-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 2rem;
  align-items: start;
}

/* Sidebar */
.sidebar-card {
  position: sticky;
  top: 88px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.sidebar-heading {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-item {
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 9px;
  color: var(--text-muted);
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}

.category-item:hover {
  background: var(--surface-2);
  color: var(--text);
}

.category-item.active {
  background: var(--primary-soft);
  color: var(--primary-text);
  font-weight: 600;
}

.search-field {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-muted);
  pointer-events: none;
}

.search-field input {
  width: 100%;
  padding: 0.65rem 0.75rem 0.65rem 2.4rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.92rem;
}

.search-field input:focus {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
  border-color: transparent;
}

.price-range input[type='range'] {
  width: 100%;
  accent-color: var(--primary);
  cursor: pointer;
}

.price-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
  font-variant-numeric: tabular-nums;
}

.clear-btn {
  padding: 0.6rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}

.clear-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

/* Results bar */
.results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.results-count {
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-muted);
  font-weight: 500;
}

.sort-field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sort-label {
  font-size: 0.88rem;
  color: var(--text-muted);
  font-weight: 500;
}

.sort-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.sort-select-wrap select {
  appearance: none;
  padding: 0.55rem 2.2rem 0.55rem 0.85rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
}

.sort-select-wrap select:focus {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.sort-chevron {
  position: absolute;
  right: 0.7rem;
  color: var(--text-muted);
  pointer-events: none;
}

/* Product grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  align-items: stretch;
}

/* Card internals live in components/ProductCard.vue so the homepage and the
   catalog render an identical product card. */

/* States */
.state-box {
  text-align: center;
  padding: 3.5rem 1.5rem;
  border: 1px dashed var(--border-strong);
  border-radius: 16px;
  color: var(--text-muted);
}

.state-box h3 {
  color: var(--text);
  margin: 0 0 0.4rem;
  font-size: 1.15rem;
}

.state-box p {
  margin: 0 0 1.25rem;
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

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  box-sizing: border-box;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
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

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2.5rem;
}

.page-btn {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s;
}

.page-btn:hover:not(:disabled) {
  background: var(--surface-2);
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* Skeleton shimmer lives in components/ProductCard.vue */

/* Responsive */
@media (max-width: 900px) {
  .catalog-layout {
    grid-template-columns: 1fr;
  }
  .filter-toggle {
    display: inline-flex;
  }
  .sidebar {
    display: none;
  }
  .sidebar.sidebar-open {
    display: block;
    margin-bottom: 1.5rem;
  }
  .sidebar-card {
    position: static;
  }
}

@media (max-width: 540px) {
  .results-bar {
    align-items: flex-start;
  }
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  /* Card internals are tuned inside components/ProductCard.vue */
}
</style>
