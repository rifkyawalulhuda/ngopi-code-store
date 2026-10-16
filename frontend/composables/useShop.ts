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
  assets?: Array<{
    id: string
    preview: string
    source: string
    name: string
  }>
  variants: Array<{
    id: string
    name: string
    price: number
    currencyCode: string
    /** Compare-at price (whole Rupiah). Set only when the variant is discounted. */
    customFields?: {
      originalPrice?: number | null
    } | null
    /** Public digital-file metadata for the storefront (size, format, limits). */
    digitalProductInfo?: {
      fileSize: number
      mimeType: string
      maxDownloadsPerOrder: number
      downloadExpiryHours: number
    } | null
  }>
  collectionIds?: string[]
  collections?: Array<{
    id: string
    name: string
    slug: string
  }>
  facetValues?: Array<{
    id: string
    code: string
    name: string
    facet?: { id: string; code: string; name: string }
  }>
  customFields?: {
    shortDescription?: string | null
    keyFeatures?: string | null
    deliveryInfo?: string | null
    productType?: string | null
    fileFormat?: string | null
    licenseType?: string | null
  }
}

export type SortOption = 'latest' | 'price-asc' | 'price-desc'

export interface ProductFilterOptions {
  categorySlug?: string
  /**
   * Restrict results to these collection slugs.
   *
   * Used to scope the catalog to the *real* product collections, which also
   * keeps uncategorized test data (seeded mockups) out of shopper-facing
   * results — server-side, with accurate counts. Vendure's search supports
   * facet *inclusion* only, so there is no way to exclude by facet.
   */
  collectionSlugs?: string[]
  search?: string
  skip?: number
  take?: number
  sort?: SortOption
  /** Client-side max price filter (DefaultSearchPlugin has no server-side price range). */
  priceMax?: number
  /** True for "load more": keeps existing results visible instead of showing skeletons. */
  append?: boolean
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
  collectionIds?: string[]
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
    collectionIds: item.collectionIds || [],
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

/** Build the DefaultSearchPlugin sort input. */
function buildSearchSort(sort?: SortOption) {
  if (sort === 'price-asc') return { price: 'ASC' as const }
  if (sort === 'price-desc') return { price: 'DESC' as const }
  // 'latest' → sort client-side (DefaultSearchPlugin doesn't support createdAt sort)
  return undefined
}

export function useShop() {
  const products: Ref<Product[]> = ref([])
  const totalItems: Ref<number> = ref(0)
  const loading: Ref<boolean> = ref(false)
  /** True while a "load more" request is in flight (existing cards stay visible). */
  const loadingMore: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  async function fetchProducts(options?: ProductFilterOptions) {
    const isAppend = options?.append ?? false
    if (isAppend) {
      loadingMore.value = true
    } else {
      loading.value = true
    }
    error.value = null

    const take = options?.take ?? 12
    const skip = options?.skip ?? 0
    const sort = buildSearchSort(options?.sort)
    const term = options?.search || ''
    const collectionSlug = options?.categorySlug || undefined
    // Scope to the real product collections when no single category is chosen.
    // This is what keeps uncategorized test data out of shopper-facing results.
    const collectionSlugs =
      !collectionSlug && options?.collectionSlugs?.length
        ? options.collectionSlugs
        : undefined
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
        ...(collectionSlug ? { collectionSlug } : {}),
        ...(collectionSlugs ? { collectionSlugs } : {}),
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

      // Client-side sort for 'latest' — DefaultSearchPlugin doesn't support
      // createdAt sort, so we sort by productId descending (higher ID = newer).
      const sortedItems = (!sort)
        ? [...items].sort((a, b) => Number(b.id) - Number(a.id))
        : items

      if (priceActive) {
        const max = options!.priceMax as number
        const filtered = sortedItems.filter((p) => (p.variants[0]?.price ?? 0) <= max)
        totalItems.value = filtered.length
        // `take` is the visible window size; the window grows on "load more".
        products.value = filtered.slice(0, take)
      } else {
        products.value = sortedItems
        totalItems.value = data.search.totalItems
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products'
      if (!isAppend) {
        products.value = []
        totalItems.value = 0
      }
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  /**
   * Fetch a single product by slug.
   *
   * Returns `null` ONLY when the product genuinely does not exist. Transport or
   * GraphQL errors are re-thrown so callers can show a "failed to load" state —
   * swallowing them here made an API outage look like a missing product.
   */
  async function getProductBySlug(slug: string): Promise<Product | null> {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({
      query: GET_PRODUCT_BY_SLUG,
      variables: { slug },
    })
    return data?.product ?? null
  }

  return {
      products,
      totalItems,
      loading,
      loadingMore,
      error,
      fetchProducts,
      getProductBySlug,
    }
  }
