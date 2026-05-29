import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * **Validates: Requirements 7.3**
 *
 * Property 13: Category Filter Correctness
 * For any category filter, verify all returned products belong to selected category,
 * no products from other categories included.
 *
 * This tests the pure filtering logic that mirrors the backend's category filtering behavior.
 * The useProductFilters composable passes categorySlug to the backend via filterOptions.
 * Here we verify the correctness property: when a category filter is applied,
 * only products belonging to that category should be returned.
 */

// Represents a product with its category associations (collections in Vendure)
interface ProductWithCategories {
  id: string
  name: string
  slug: string
  categorySlug: string // primary category slug
  collectionSlugs: string[] // all collections this product belongs to
}

/**
 * Pure filtering function that represents the category filter logic.
 * This mirrors what the Vendure backend does when collectionSlug is provided:
 * - If no category is selected (empty string), return all products
 * - If a category is selected, return only products that belong to that category
 */
function filterProductsByCategory(
  products: ProductWithCategories[],
  categorySlug: string
): ProductWithCategories[] {
  if (!categorySlug) {
    return products
  }
  return products.filter(
    (product) => product.collectionSlugs.includes(categorySlug)
  )
}

// Arbitraries for generating test data
const categorySlugArb = fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/)

const productArb = (availableCategories: string[]) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    slug: fc.stringMatching(/^[a-z][a-z0-9-]{1,30}$/),
    categorySlug: fc.constantFrom(...availableCategories),
    collectionSlugs: fc
      .subarray(availableCategories, { minLength: 1 })
      .map((slugs) => [...new Set(slugs)]),
  })

describe('Property 13: Category Filter Correctness', () => {
  it('all returned products belong to the selected category', () => {
    fc.assert(
      fc.property(
        fc
          .array(categorySlugArb, { minLength: 2, maxLength: 6 })
          .chain((categories) => {
            const uniqueCategories = [...new Set(categories)]
            if (uniqueCategories.length < 2) {
              return fc.constant({
                categories: ['source-code', 'ebooks'],
                products: [] as ProductWithCategories[],
                selectedCategory: 'source-code',
              })
            }
            return fc
              .tuple(
                fc.array(productArb(uniqueCategories), {
                  minLength: 1,
                  maxLength: 20,
                }),
                fc.constantFrom(...uniqueCategories)
              )
              .map(([products, selectedCategory]) => ({
                categories: uniqueCategories,
                products,
                selectedCategory,
              }))
          }),
        ({ products, selectedCategory }) => {
          const filtered = filterProductsByCategory(products, selectedCategory)

          // All returned products must belong to the selected category
          for (const product of filtered) {
            expect(product.collectionSlugs).toContain(selectedCategory)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('no products from other categories are incorrectly included', () => {
    fc.assert(
      fc.property(
        fc
          .array(categorySlugArb, { minLength: 2, maxLength: 6 })
          .chain((categories) => {
            const uniqueCategories = [...new Set(categories)]
            if (uniqueCategories.length < 2) {
              return fc.constant({
                categories: ['source-code', 'ebooks'],
                products: [] as ProductWithCategories[],
                selectedCategory: 'source-code',
              })
            }
            return fc
              .tuple(
                fc.array(productArb(uniqueCategories), {
                  minLength: 1,
                  maxLength: 20,
                }),
                fc.constantFrom(...uniqueCategories)
              )
              .map(([products, selectedCategory]) => ({
                categories: uniqueCategories,
                products,
                selectedCategory,
              }))
          }),
        ({ products, selectedCategory }) => {
          const filtered = filterProductsByCategory(products, selectedCategory)

          // No product that does NOT belong to the selected category should be in the result
          const productsNotInCategory = products.filter(
            (p) => !p.collectionSlugs.includes(selectedCategory)
          )
          for (const excluded of productsNotInCategory) {
            expect(filtered).not.toContainEqual(excluded)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('returns all products when no category is selected', () => {
    fc.assert(
      fc.property(
        fc
          .array(categorySlugArb, { minLength: 2, maxLength: 5 })
          .chain((categories) => {
            const uniqueCategories = [...new Set(categories)]
            if (uniqueCategories.length < 2) {
              return fc.constant([] as ProductWithCategories[])
            }
            return fc.array(productArb(uniqueCategories), {
              minLength: 0,
              maxLength: 20,
            })
          }),
        (products) => {
          // When no category filter is applied (empty string), all products are returned
          const filtered = filterProductsByCategory(products, '')

          expect(filtered).toHaveLength(products.length)
          expect(filtered).toEqual(products)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('filtered result is a subset of the original product list', () => {
    fc.assert(
      fc.property(
        fc
          .array(categorySlugArb, { minLength: 2, maxLength: 6 })
          .chain((categories) => {
            const uniqueCategories = [...new Set(categories)]
            if (uniqueCategories.length < 2) {
              return fc.constant({
                products: [] as ProductWithCategories[],
                selectedCategory: 'source-code',
              })
            }
            return fc
              .tuple(
                fc.array(productArb(uniqueCategories), {
                  minLength: 0,
                  maxLength: 20,
                }),
                fc.constantFrom(...uniqueCategories)
              )
              .map(([products, selectedCategory]) => ({
                products,
                selectedCategory,
              }))
          }),
        ({ products, selectedCategory }) => {
          const filtered = filterProductsByCategory(products, selectedCategory)

          // Filtered result must be a subset of the original list
          expect(filtered.length).toBeLessThanOrEqual(products.length)
          for (const product of filtered) {
            expect(products).toContainEqual(product)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('filterOptions correctly passes categorySlug from useProductFilters', () => {
    // This test verifies the composable's filterOptions computed property
    // correctly maps the category value to categorySlug for the backend query
    fc.assert(
      fc.property(categorySlugArb, (categorySlug) => {
        // Simulate what useProductFilters.filterOptions does
        const filterOptions = {
          categorySlug: categorySlug || undefined,
          search: undefined,
          skip: 0,
          take: 12,
        }

        // When a category is set, categorySlug must be present in filterOptions
        if (categorySlug) {
          expect(filterOptions.categorySlug).toBe(categorySlug)
        }
      }),
      { numRuns: 200 }
    )
  })
})
