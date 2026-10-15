import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface ProductFiltersState {
  category: string
  search: string
  page: number
}

export interface UseProductFiltersOptions {
  pageSize?: number
}

export type SortOption = 'latest' | 'price-asc' | 'price-desc'

const MIN_SEARCH_LENGTH = 2

/** Upper bound of the price filter. Values at/above this mean "no price filter". */
export const PRICE_CEILING = 5_000_000

export function useProductFilters(options?: UseProductFiltersOptions) {
  const route = useRoute()
  const router = useRouter()
  const pageSize = options?.pageSize ?? 12

  // Initialize state from URL query params
  const category: Ref<string> = ref((route.query.category as string) || '')
  const search: Ref<string> = ref((route.query.search as string) || '')
  const page: Ref<number> = ref(Number(route.query.page) || 1)
  const sort: Ref<SortOption> = ref(normalizeSort(route.query.sort))
  const priceMax: Ref<number> = ref(normalizePriceMax(route.query.max))

  // Computed: effective search term (only applied if >= 2 chars)
  const effectiveSearch = computed(() => {
    return search.value.length >= MIN_SEARCH_LENGTH ? search.value : ''
  })

  // Computed: skip value for pagination
  const skip = computed(() => (page.value - 1) * pageSize)

  // Computed: filter options for useShop.fetchProducts
  const filterOptions = computed(() => ({
    categorySlug: category.value || undefined,
    search: effectiveSearch.value || undefined,
    skip: skip.value,
    take: pageSize,
  }))

  // Update URL query params when filters change.
  //
  // Default values are omitted so a pristine catalog keeps a clean URL, and so
  // non-default state (sort, price cap) is shareable and survives a reload.
  function syncToUrl() {
    const query: Record<string, string> = {}
    if (category.value) query.category = category.value
    if (search.value) query.search = search.value
    if (page.value > 1) query.page = String(page.value)
    if (sort.value !== 'latest') query.sort = sort.value
    if (priceMax.value < PRICE_CEILING) query.max = String(priceMax.value)

    router.replace({ query })
  }

  // Set category and reset pagination
  function setCategory(newCategory: string) {
    category.value = newCategory
    page.value = 1
    syncToUrl()
  }

  // Set search and reset pagination
  function setSearch(newSearch: string) {
    search.value = newSearch
    page.value = 1
    syncToUrl()
  }

  // Set page (preserves filters)
  function setPage(newPage: number) {
    page.value = newPage
    syncToUrl()
  }

  // Set sort order and reset pagination
  function setSort(newSort: SortOption) {
    sort.value = newSort
    page.value = 1
    syncToUrl()
  }

  // Set the price ceiling and reset pagination
  function setPriceMax(newMax: number) {
    priceMax.value = newMax
    page.value = 1
    syncToUrl()
  }

  // Clear all filters
  function clearFilters() {
    category.value = ''
    search.value = ''
    page.value = 1
    sort.value = 'latest'
    priceMax.value = PRICE_CEILING
    syncToUrl()
  }

  // Check if any filters are active. Sort is a view preference rather than a
  // filter, so it is deliberately excluded.
  const hasActiveFilters = computed(() => {
    return (
      category.value !== '' ||
      effectiveSearch.value !== '' ||
      priceMax.value < PRICE_CEILING
    )
  })

  return {
    category,
    search,
    page,
    pageSize,
    sort,
    priceMax,
    effectiveSearch,
    skip,
    filterOptions,
    hasActiveFilters,
    setCategory,
    setSearch,
    setPage,
    setSort,
    setPriceMax,
    clearFilters,
    syncToUrl,
  }
}

/** Accepts only the known sort values; anything else falls back to the default. */
function normalizeSort(raw: unknown): SortOption {
  const value = String(raw ?? '')
  return value === 'price-asc' || value === 'price-desc' ? value : 'latest'
}

/** Parses the price cap from the URL, falling back to the ceiling. */
function normalizePriceMax(raw: unknown): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return PRICE_CEILING
  return Math.min(parsed, PRICE_CEILING)
}
