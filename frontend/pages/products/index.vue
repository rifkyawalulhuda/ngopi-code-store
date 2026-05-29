<template>
  <div class="products-page">
    <h1>Produk Digital</h1>

    <!-- Filters Section -->
    <div class="filters">
      <!-- Category Filter -->
      <div class="filter-group">
        <label for="category-filter">Kategori</label>
        <select
          id="category-filter"
          :value="category"
          @change="onCategoryChange"
          aria-label="Filter berdasarkan kategori"
        >
          <option value="">Semua Kategori</option>
          <option
            v-for="collection in collections"
            :key="collection.id"
            :value="collection.slug"
          >
            {{ collection.name }}
          </option>
        </select>
      </div>

      <!-- Search Input -->
      <div class="filter-group">
        <label for="search-input">Cari</label>
        <input
          id="search-input"
          type="text"
          :value="search"
          placeholder="Cari produk (min. 2 karakter)..."
          aria-label="Cari produk berdasarkan nama atau deskripsi"
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state" aria-live="polite">
      <p>Memuat produk...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state" role="alert">
      <p>{{ error }}</p>
      <button @click="loadProducts">Coba Lagi</button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="products.length === 0"
      class="empty-state"
      aria-live="polite"
    >
      <p>Tidak ada produk yang ditemukan.</p>
      <p v-if="hasActiveFilters">
        Coba ubah filter atau kata kunci pencarian Anda.
      </p>
      <button v-if="hasActiveFilters" @click="clearFilters">
        Hapus Filter
      </button>
    </div>

    <!-- Product Grid -->
    <div v-else class="product-grid">
      <div
        v-for="product in products"
        :key="product.id"
        class="product-card"
      >
        <img
          v-if="product.featuredAsset"
          :src="product.featuredAsset.preview"
          :alt="product.name"
          class="product-image"
        />
        <div class="product-info">
          <h2 class="product-name">{{ product.name }}</h2>
          <p class="product-description">
            {{ truncateDescription(product.description) }}
          </p>
          <p class="product-price">
            {{ formatPrice(product.variants?.[0]?.price) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination" aria-label="Navigasi halaman">
      <button
        :disabled="page <= 1"
        aria-label="Halaman sebelumnya"
        @click="goToPage(page - 1)"
      >
        &laquo; Sebelumnya
      </button>
      <span class="page-info">
        Halaman {{ page }} dari {{ totalPages }}
      </span>
      <button
        :disabled="page >= totalPages"
        aria-label="Halaman berikutnya"
        @click="goToPage(page + 1)"
      >
        Berikutnya &raquo;
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useShop } from '~/composables/useShop'
import { useProductFilters } from '~/composables/useProductFilters'
import { GET_COLLECTIONS } from '~/graphql/queries/collections'
import { formatPriceIDR, truncateDescription as truncateDesc } from '~/utils/format'

useHead({
  title: 'Produk - NgopiCode Digital Store',
})

interface Collection {
  id: string
  name: string
  slug: string
}

const PAGE_SIZE = 12

const { products, totalItems, loading, error, fetchProducts } = useShop()
const {
  category,
  search,
  page,
  effectiveSearch,
  filterOptions,
  hasActiveFilters,
  setCategory,
  setSearch,
  setPage,
  clearFilters,
} = useProductFilters({ pageSize: PAGE_SIZE })

const collections = ref<Collection[]>([])

// Computed total pages
const totalPages = computed(() => Math.ceil(totalItems.value / PAGE_SIZE))

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Load collections for category filter
async function loadCollections() {
  try {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({
      query: GET_COLLECTIONS,
    })
    collections.value = data.collections.items.filter(
      (c: any) => c.parent?.id !== undefined
    )
  } catch {
    // Silently fail - categories are optional enhancement
    collections.value = []
  }
}

// Load products with current filters
async function loadProducts() {
  await fetchProducts(filterOptions.value)
}

// Event handlers
function onCategoryChange(event: Event) {
  const target = event.target as HTMLSelectElement
  setCategory(target.value)
  loadProducts()
}

function onSearchInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Update search value immediately for display
  search.value = value

  // Debounce the actual search request
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    setSearch(value)
    loadProducts()
  }, 300)
}

function goToPage(newPage: number) {
  setPage(newPage)
  loadProducts()
}

// Utility functions
function truncateDescription(description: string): string {
  return truncateDesc(description, 150)
}

function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return 'Rp 0'
  return formatPriceIDR(price)
}

// Watch for route query changes (e.g., browser back/forward)
watch(
  () => filterOptions.value,
  () => {
    // filterOptions is reactive, but we load manually on user actions
  },
  { deep: true }
)

// Initial load
onMounted(async () => {
  await Promise.all([loadCollections(), loadProducts()])
})
</script>

<style scoped>
.products-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
}

.filter-group select,
.filter-group input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-width: 200px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.error-state {
  color: #dc3545;
}

.empty-state p {
  margin-bottom: 0.5rem;
  color: #666;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.product-card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.product-info {
  padding: 1rem;
}

.product-name {
  font-size: 1.125rem;
  margin: 0 0 0.5rem;
}

.product-description {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 0.75rem;
  line-height: 1.4;
}

.product-price {
  font-size: 1rem;
  font-weight: 600;
  color: #2d7d46;
  margin: 0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem 0;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #666;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
}

button:hover:not(:disabled) {
  background: #f5f5f5;
}
</style>
