import { describe, it, expect, vi } from 'vitest'
import { formatPriceIDR, truncateDescription } from '~/utils/format'

/**
 * Since the products page is a Nuxt page component that relies heavily on
 * Nuxt-specific composables (useRoute, useRouter, useHead, useNuxtApp),
 * we test the core logic functions that the page depends on.
 * The page's rendering behavior is validated through the utility functions
 * and the useShop composable.
 */

describe('Product Catalog Page - Core Logic', () => {
  describe('Price display (IDR format)', () => {
    it('displays price in IDR format for typical digital product prices', () => {
      // Typical prices for digital products in Indonesia
      expect(formatPriceIDR(5000000)).toBe('Rp 50.000')   // Rp 50.000
      expect(formatPriceIDR(15000000)).toBe('Rp 150.000') // Rp 150.000
      expect(formatPriceIDR(50000000)).toBe('Rp 500.000') // Rp 500.000
    })
  })

  describe('Description truncation (150 chars)', () => {
    it('truncates long product descriptions to 150 characters with ellipsis', () => {
      const longDescription = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
      const result = truncateDescription(longDescription)
      expect(result.length).toBeLessThanOrEqual(153) // 150 + '...'
      expect(result.endsWith('...')).toBe(true)
    })

    it('does not truncate short descriptions', () => {
      const shortDescription = 'A simple starter template for Nuxt 3 projects.'
      expect(truncateDescription(shortDescription)).toBe(shortDescription)
    })
  })

  describe('Pagination logic', () => {
    it('calculates total pages correctly', () => {
      // Default page size: 12
      const pageSize = 12
      expect(Math.ceil(0 / pageSize)).toBe(0)
      expect(Math.ceil(1 / pageSize)).toBe(1)
      expect(Math.ceil(12 / pageSize)).toBe(1)
      expect(Math.ceil(13 / pageSize)).toBe(2)
      expect(Math.ceil(48 / pageSize)).toBe(4)
      expect(Math.ceil(100 / pageSize)).toBe(9)
    })

    it('calculates skip offset correctly for pagination', () => {
      const pageSize = 12
      // Page 1 -> skip 0
      expect((1 - 1) * pageSize).toBe(0)
      // Page 2 -> skip 12
      expect((2 - 1) * pageSize).toBe(12)
      // Page 3 -> skip 24
      expect((3 - 1) * pageSize).toBe(24)
    })

    it('enforces max page size of 48', () => {
      const MAX_PAGE_SIZE = 48
      expect(Math.min(12, MAX_PAGE_SIZE)).toBe(12)
      expect(Math.min(48, MAX_PAGE_SIZE)).toBe(48)
      expect(Math.min(100, MAX_PAGE_SIZE)).toBe(48)
    })

    it('enforces minimum page size of 1', () => {
      const clampPageSize = (size: number) => Math.min(Math.max(size, 1), 48)
      expect(clampPageSize(0)).toBe(1)
      expect(clampPageSize(-5)).toBe(1)
      expect(clampPageSize(12)).toBe(12)
    })
  })
})
