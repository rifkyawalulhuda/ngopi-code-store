import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductFilters } from './useProductFilters'

// Mock vue-router
const mockRoute = {
  query: {} as Record<string, string>,
}
const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    replace: mockReplace,
  }),
}))

describe('useProductFilters', () => {
  beforeEach(() => {
    mockRoute.query = {}
    mockReplace.mockClear()
  })

  describe('initialization', () => {
    it('initializes with default values when no query params', () => {
      const { category, search, page, pageSize } = useProductFilters()

      expect(category.value).toBe('')
      expect(search.value).toBe('')
      expect(page.value).toBe(1)
      expect(pageSize).toBe(12)
    })

    it('initializes from URL query params', () => {
      mockRoute.query = { category: 'source-code', search: 'nuxt', page: '3' }

      const { category, search, page } = useProductFilters()

      expect(category.value).toBe('source-code')
      expect(search.value).toBe('nuxt')
      expect(page.value).toBe(3)
    })

    it('accepts custom page size', () => {
      const { pageSize } = useProductFilters({ pageSize: 24 })
      expect(pageSize).toBe(24)
    })
  })

  describe('setCategory', () => {
    it('sets category and resets page to 1', () => {
      mockRoute.query = { page: '5' }
      const { setCategory, category, page } = useProductFilters()

      setCategory('ebooks')

      expect(category.value).toBe('ebooks')
      expect(page.value).toBe(1)
    })

    it('syncs to URL when category changes', () => {
      const { setCategory } = useProductFilters()

      setCategory('templates')

      expect(mockReplace).toHaveBeenCalledWith({
        query: { category: 'templates' },
      })
    })

    it('clears category when empty string is passed', () => {
      mockRoute.query = { category: 'source-code' }
      const { setCategory } = useProductFilters()

      setCategory('')

      expect(mockReplace).toHaveBeenCalledWith({ query: {} })
    })
  })

  describe('setSearch', () => {
    it('sets search and resets page to 1', () => {
      mockRoute.query = { page: '3' }
      const { setSearch, search, page } = useProductFilters()

      setSearch('vue starter')

      expect(search.value).toBe('vue starter')
      expect(page.value).toBe(1)
    })

    it('syncs to URL when search changes', () => {
      const { setSearch } = useProductFilters()

      setSearch('react')

      expect(mockReplace).toHaveBeenCalledWith({
        query: { search: 'react' },
      })
    })
  })

  describe('effectiveSearch', () => {
    it('returns empty string when search is less than 2 characters', () => {
      const { search, effectiveSearch } = useProductFilters()

      search.value = 'a'
      expect(effectiveSearch.value).toBe('')

      search.value = ''
      expect(effectiveSearch.value).toBe('')
    })

    it('returns search value when 2 or more characters', () => {
      const { search, effectiveSearch } = useProductFilters()

      search.value = 'ab'
      expect(effectiveSearch.value).toBe('ab')

      search.value = 'nuxt template'
      expect(effectiveSearch.value).toBe('nuxt template')
    })
  })

  describe('setPage', () => {
    it('sets page and preserves filters', () => {
      mockRoute.query = { category: 'source-code', search: 'vue' }
      const { setPage, page } = useProductFilters()

      setPage(3)

      expect(page.value).toBe(3)
      expect(mockReplace).toHaveBeenCalledWith({
        query: { category: 'source-code', search: 'vue', page: '3' },
      })
    })

    it('does not include page=1 in URL', () => {
      const { setPage } = useProductFilters()

      setPage(1)

      expect(mockReplace).toHaveBeenCalledWith({ query: {} })
    })
  })

  describe('skip computation', () => {
    it('computes correct skip for page 1', () => {
      const { skip } = useProductFilters({ pageSize: 12 })
      expect(skip.value).toBe(0)
    })

    it('computes correct skip for page 3 with pageSize 12', () => {
      mockRoute.query = { page: '3' }
      const { skip } = useProductFilters({ pageSize: 12 })
      expect(skip.value).toBe(24)
    })
  })

  describe('filterOptions', () => {
    it('returns correct filter options with all filters active', () => {
      mockRoute.query = { category: 'ebooks', search: 'vue', page: '2' }
      const { filterOptions } = useProductFilters({ pageSize: 12 })

      expect(filterOptions.value).toEqual({
        categorySlug: 'ebooks',
        search: 'vue',
        skip: 12,
        take: 12,
      })
    })

    it('returns undefined for empty category and search', () => {
      const { filterOptions } = useProductFilters()

      expect(filterOptions.value.categorySlug).toBeUndefined()
      expect(filterOptions.value.search).toBeUndefined()
    })

    it('returns undefined search when less than 2 chars', () => {
      mockRoute.query = { search: 'a' }
      const { filterOptions } = useProductFilters()

      expect(filterOptions.value.search).toBeUndefined()
    })
  })

  describe('clearFilters', () => {
    it('resets all filters and page', () => {
      mockRoute.query = { category: 'source-code', search: 'vue', page: '5' }
      const { clearFilters, category, search, page } = useProductFilters()

      clearFilters()

      expect(category.value).toBe('')
      expect(search.value).toBe('')
      expect(page.value).toBe(1)
      expect(mockReplace).toHaveBeenCalledWith({ query: {} })
    })
  })

  describe('hasActiveFilters', () => {
    it('returns false when no filters active', () => {
      const { hasActiveFilters } = useProductFilters()
      expect(hasActiveFilters.value).toBe(false)
    })

    it('returns true when category is set', () => {
      mockRoute.query = { category: 'ebooks' }
      const { hasActiveFilters } = useProductFilters()
      expect(hasActiveFilters.value).toBe(true)
    })

    it('returns true when search has 2+ characters', () => {
      mockRoute.query = { search: 'vue' }
      const { hasActiveFilters } = useProductFilters()
      expect(hasActiveFilters.value).toBe(true)
    })

    it('returns false when search has less than 2 characters', () => {
      mockRoute.query = { search: 'v' }
      const { hasActiveFilters } = useProductFilters()
      expect(hasActiveFilters.value).toBe(false)
    })
  })
})
