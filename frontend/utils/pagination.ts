/**
 * Pure pagination computation utilities.
 * These functions encapsulate the pagination logic used by useProductFilters
 * and can be tested independently of Vue reactivity.
 */

export const MIN_PAGE_SIZE = 1
export const MAX_PAGE_SIZE = 48
export const DEFAULT_PAGE_SIZE = 12

/**
 * Clamp page size to valid range [1, 48].
 */
export function clampPageSize(pageSize: number): number {
  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize)))
}

/**
 * Compute the skip (offset) value for a given page and page size.
 * Page is 1-indexed: page 1 → skip 0, page 2 → skip pageSize, etc.
 */
export function computeSkip(page: number, pageSize: number): number {
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = clampPageSize(pageSize)
  return (safePage - 1) * safePageSize
}

/**
 * Compute the total number of pages for a given total count and page size.
 */
export function computeTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0) return 0
  const safePageSize = clampPageSize(pageSize)
  return Math.ceil(totalCount / safePageSize)
}

/**
 * Compute how many items a specific page should contain.
 * Returns at most pageSize items. The last page may have fewer.
 */
export function computePageItemCount(
  page: number,
  pageSize: number,
  totalCount: number
): number {
  if (totalCount <= 0) return 0
  const safePageSize = clampPageSize(pageSize)
  const safePage = Math.max(1, Math.floor(page))
  const totalPages = computeTotalPages(totalCount, safePageSize)

  if (safePage > totalPages) return 0

  if (safePage < totalPages) {
    return safePageSize
  }

  // Last page: remainder or full page if evenly divisible
  const remainder = totalCount % safePageSize
  return remainder === 0 ? safePageSize : remainder
}
