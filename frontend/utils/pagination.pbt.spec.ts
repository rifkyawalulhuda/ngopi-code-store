import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  clampPageSize,
  computeSkip,
  computeTotalPages,
  computePageItemCount,
  MIN_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './pagination'

/**
 * **Validates: Requirements 7.5**
 *
 * Property 14: Pagination Correctness
 * For any product listing with total count T and page size M, requesting page P
 * returns at most M items, the items correspond to the correct offset (P-1) * M,
 * and the last page contains T mod M items (or M if evenly divisible).
 */
describe('Property 14: Pagination Correctness', () => {
  // Smart generators constrained to realistic input space
  const totalCountArb = fc.integer({ min: 1, max: 10000 })
  const rawPageSizeArb = fc.integer({ min: 1, max: 100 }) // includes values outside valid range
  const validPageSizeArb = fc.integer({ min: MIN_PAGE_SIZE, max: MAX_PAGE_SIZE })

  it('page size is clamped between 1 and 48', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 200 }), (rawSize) => {
        const clamped = clampPageSize(rawSize)
        expect(clamped).toBeGreaterThanOrEqual(MIN_PAGE_SIZE)
        expect(clamped).toBeLessThanOrEqual(MAX_PAGE_SIZE)
      }),
      { numRuns: 200 }
    )
  })

  it('skip offset is correctly calculated as (P-1) * M for any page and page size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }), // page
        validPageSizeArb,
        (page, pageSize) => {
          const skip = computeSkip(page, pageSize)
          expect(skip).toBe((page - 1) * pageSize)
        }
      ),
      { numRuns: 500 }
    )
  })

  it('total pages equals ceil(T / M) for any total count and page size', () => {
    fc.assert(
      fc.property(totalCountArb, validPageSizeArb, (totalCount, pageSize) => {
        const totalPages = computeTotalPages(totalCount, pageSize)
        expect(totalPages).toBe(Math.ceil(totalCount / pageSize))
      }),
      { numRuns: 500 }
    )
  })

  it('any page returns at most M items', () => {
    fc.assert(
      fc.property(
        totalCountArb,
        validPageSizeArb,
        fc.integer({ min: 1, max: 500 }), // page
        (totalCount, pageSize, page) => {
          const itemCount = computePageItemCount(page, pageSize, totalCount)
          expect(itemCount).toBeLessThanOrEqual(pageSize)
          expect(itemCount).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 500 }
    )
  })

  it('last page has correct remainder (T mod M, or M if evenly divisible)', () => {
    fc.assert(
      fc.property(totalCountArb, validPageSizeArb, (totalCount, pageSize) => {
        const totalPages = computeTotalPages(totalCount, pageSize)
        const lastPageItems = computePageItemCount(totalPages, pageSize, totalCount)

        const remainder = totalCount % pageSize
        const expectedLastPageItems = remainder === 0 ? pageSize : remainder

        expect(lastPageItems).toBe(expectedLastPageItems)
      }),
      { numRuns: 500 }
    )
  })

  it('sum of all page item counts equals total count', () => {
    fc.assert(
      fc.property(totalCountArb, validPageSizeArb, (totalCount, pageSize) => {
        const totalPages = computeTotalPages(totalCount, pageSize)
        let sum = 0
        for (let p = 1; p <= totalPages; p++) {
          sum += computePageItemCount(p, pageSize, totalCount)
        }
        expect(sum).toBe(totalCount)
      }),
      { numRuns: 200 }
    )
  })

  it('pages beyond total pages return 0 items', () => {
    fc.assert(
      fc.property(totalCountArb, validPageSizeArb, (totalCount, pageSize) => {
        const totalPages = computeTotalPages(totalCount, pageSize)
        const beyondPage = totalPages + 1
        const itemCount = computePageItemCount(beyondPage, pageSize, totalCount)
        expect(itemCount).toBe(0)
      }),
      { numRuns: 200 }
    )
  })

  it('non-last pages always return exactly M items', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10000 }), // totalCount >= 2 to ensure multiple pages possible
        validPageSizeArb,
        (totalCount, pageSize) => {
          const totalPages = computeTotalPages(totalCount, pageSize)
          if (totalPages > 1) {
            // Check all non-last pages return exactly pageSize items
            for (let p = 1; p < totalPages; p++) {
              const itemCount = computePageItemCount(p, pageSize, totalCount)
              expect(itemCount).toBe(pageSize)
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('skip offset for page P is consistent with items on previous pages', () => {
    fc.assert(
      fc.property(
        totalCountArb,
        validPageSizeArb,
        (totalCount, pageSize) => {
          const totalPages = computeTotalPages(totalCount, pageSize)
          for (let p = 1; p <= Math.min(totalPages, 10); p++) {
            const skip = computeSkip(p, pageSize)
            // Skip should equal sum of items on all previous pages
            let previousItemsSum = 0
            for (let prev = 1; prev < p; prev++) {
              previousItemsSum += computePageItemCount(prev, pageSize, totalCount)
            }
            expect(skip).toBe(previousItemsSum)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('page size clamping preserves values within valid range', () => {
    fc.assert(
      fc.property(validPageSizeArb, (pageSize) => {
        expect(clampPageSize(pageSize)).toBe(pageSize)
      }),
      { numRuns: 200 }
    )
  })

  it('zero total count returns 0 total pages and 0 items', () => {
    fc.assert(
      fc.property(validPageSizeArb, fc.integer({ min: 1, max: 100 }), (pageSize, page) => {
        expect(computeTotalPages(0, pageSize)).toBe(0)
        expect(computePageItemCount(page, pageSize, 0)).toBe(0)
      }),
      { numRuns: 100 }
    )
  })
})
