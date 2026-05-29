import { ref, computed, watch } from 'vue'
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

const MIN_SEARCH_LENGTH = 2

export function useProductFilters(options?: UseProductFiltersOptions) {
  const route = useRoute()
  const router = useRouter()
  const pageSize = options?.pageSize ?? 12

  // Initialize state from URL query params
  const category: Ref<string> = ref((route.query.category as string) || '')
  const search: Ref<string> = ref((route.query.search as string) || '')
  const page: Ref<number> = ref(Number(route.query.page) || 1)

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

  // Update URL query params when filters change
  function syncToUrl() {
    const query: Record<string, string> = {}
    if (category.value) query.category = category.value
    if (search.value) query.search = search.value
    if (page.value > 1) query.page = String(page.value)

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

  // Clear all filters
  function clearFilters() {
    category.value = ''
    search.value = ''
    page.value = 1
    syncToUrl()
  }

  // Check if any filters are active
  const hasActiveFilters = computed(() => {
    return category.value !== '' || effectiveSearch.value !== ''
  })

  return {
    category,
    search,
    page,
    pageSize,
    effectiveSearch,
    skip,
    filterOptions,
    hasActiveFilters,
    setCategory,
    setSearch,
    setPage,
    clearFilters,
    syncToUrl,
  }
}
