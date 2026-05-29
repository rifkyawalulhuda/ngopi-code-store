import { ref } from 'vue'
import type { Ref } from 'vue'
import { GET_PRODUCT_BY_SLUG, SEARCH_PRODUCTS } from '~/graphql/queries/products'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  featuredAsset: {
    id: string
    preview: string
  } | null
  variants: Array<{
    id: string
    name: string
    price: number
    currencyCode: string
  }>
}

export type SortOption = 'latest' | 'price-asc' | 'price-desc'

export interface ProductFilterOptions {
  categorySlug?: string
  search?: string
  skip?: number
  take?: number
  sort?: SortOption
  /** Client-side max price filter (DefaultSearchPlugin has no server-side price range). */
  priceMax?: number
}

/** Upper bound above which the price filter is considered inactive. */
const PRICE_FILTER_CEILING = 5_000_000
/** How many items to pull when a client-side price filter is active. */
const PRICE_FILTER_FETCH_CAP = 200

interface SearchResultItem {
  productId: string
  productName: string
  slug: string
  description?: string
  price?: { value?: number; min?: number; max?: number }
  productAsset?: { id: string; preview: string } | null
}

/** Extract a comparable price (minor units) from a Vendure search price union. */
function extractPrice(price?: SearchResultItem['price']): number {
  if (!price) return 0
  if (typeof price.value === 'number') return price.value
  if (typeof price.min === 'number') return price.min
  return 0
}

function mapSearchItem(item: SearchResultItem): Product {
  const price = extractPrice(item.price)
  return {
    id: item.productId,
    name: item.productName,
    slug: item.slug,
    description: item.description || '',
    featuredAsset: item.productAsset
      ? { id: item.productAsset.id, preview: item.productAsset.preview }
      : null,
    variants: [
      {
        id: `${item.productId}-variant`,
        name: item.productName,
        price,
        currencyCode: 'IDR',
      },
    ],
  }
}

/** Build the DefaultSearchPlugin sort input. "latest" uses default index order. */
function buildSearchSort(sort?: SortOption) {
  if (sort === 'price-asc') return { price: 'ASC' as const }
  if (sort === 'price-desc') return { price: 'DESC' as const }
  return undefined
}

export function useShop() {
  const products: Ref<Product[]> = ref([])
  const totalItems: Ref<number> = ref(0)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  async function fetchProducts(options?: ProductFilterOptions) {
    loading.value = true
    error.value = null

    const take = options?.take ?? 12
    const skip = options?.skip ?? 0
    const sort = buildSearchSort(options?.sort)
    const term = options?.search || ''
    const collectionSlug = options?.categorySlug || undefined
    const priceActive =
      typeof options?.priceMax === 'number' && options.priceMax < PRICE_FILTER_CEILING

    try {
      const { $apollo } = useNuxtApp()

      // When a client-side price filter is active, pull a wide window for the
      // current category/term, then filter + paginate locally. Otherwise use
      // efficient server-side pagination.
      const input: Record<string, unknown> = {
        groupByProduct: true,
        term,
        collectionSlug,
        ...(sort ? { sort } : {}),
        take: priceActive ? PRICE_FILTER_FETCH_CAP : take,
        skip: priceActive ? 0 : skip,
      }

      const { data } = await $apollo.defaultClient.query({
        query: SEARCH_PRODUCTS,
        variables: { input },
        fetchPolicy: 'no-cache',
      })

      const items: Product[] = data.search.items.map(mapSearchItem)

      if (priceActive) {
        const max = options!.priceMax as number
        const filtered = items.filter((p) => (p.variants[0]?.price ?? 0) <= max)
        totalItems.value = filtered.length
        products.value = filtered.slice(skip, skip + take)
      } else {
        products.value = items
        totalItems.value = data.search.totalItems
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products'
      products.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  async function getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_PRODUCT_BY_SLUG,
        variables: { slug },
      })
      return data.product || null
    } catch {
      return null
    }
  }

  return {
    products,
    totalItems,
    loading,
    error,
    fetchProducts,
    getProductBySlug,
  }
}
