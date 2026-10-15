/**
 * Catalog presentation helpers.
 */

/**
 * Slug prefixes reserved for test data (seeded mockup products, E2E fixtures).
 *
 * These products stay enabled so the checkout flow can be tested end-to-end,
 * but they must never be presented as real catalog items — on the homepage, in
 * category navigation, or in "latest products" lists.
 *
 * Products are matched by slug rather than by an ID list so the rule keeps
 * working after a reseed (new IDs) and does not need a config update.
 */
export const TEST_PRODUCT_SLUG_PREFIXES = ['mockup-', 'guest-test-'] as const

/** True when a product slug belongs to test data that should be hidden from shoppers. */
export function isTestProduct(slug: string | null | undefined): boolean {
  if (!slug) return false
  return TEST_PRODUCT_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix))
}

/** Drops test data from a product list, preserving order. */
export function excludeTestProducts<T extends { slug: string }>(items: T[]): T[] {
  return items.filter((item) => !isTestProduct(item.slug))
}

/** URL for the catalog filtered to one category. */
export function categoryUrl(slug: string): string {
  return `/products?category=${encodeURIComponent(slug)}`
}

/** URL for the catalog showing search results. */
export function searchUrl(term: string): string {
  const trimmed = term.trim()
  return trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : '/products'
}
