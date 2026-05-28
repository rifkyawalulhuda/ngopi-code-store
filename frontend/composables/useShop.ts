import { ref } from 'vue'
import type { Ref } from 'vue'
import { GET_PRODUCTS, GET_PRODUCT_BY_SLUG, SEARCH_PRODUCTS } from '~/graphql/queries/products'

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

export interface ProductFilterOptions {
  categorySlug?: string
  search?: string
  skip?: number
  take?: number
  sort?: { price?: 'ASC' | 'DESC'; createdAt?: 'ASC' | 'DESC' }
}

export function useShop() {
  const products: Ref<Product[]> = ref([])
  const totalItems: Ref<number> = ref(0)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  async function fetchProducts(options?: ProductFilterOptions) {
    loading.value = true
    error.value = null

    try {
      const { $apollo } = useNuxtApp()
      const take = options?.take ?? 12
      const skip = options?.skip ?? 0

      if (options?.search) {
        const { data } = await $apollo.defaultClient.query({
          query: SEARCH_PRODUCTS,
          variables: {
            input: {
              term: options.search,
              take,
              skip,
              collectionSlug: options.categorySlug || undefined,
            },
          },
        })

        products.value = data.search.items.map((item: any) => ({
          id: item.productId,
          name: item.productName,
          slug: item.slug,
          description: item.description || '',
          featuredAsset: item.productAsset
            ? { id: item.productAsset.id, preview: item.productAsset.preview }
            : null,
          variants: [],
        }))
        totalItems.value = data.search.totalItems
      } else {
        const { data } = await $apollo.defaultClient.query({
          query: GET_PRODUCTS,
          variables: {
            options: {
              take,
              skip,
              ...(options?.sort && { sort: options.sort }),
            },
          },
        })

        products.value = data.products.items
        totalItems.value = data.products.totalItems
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products'
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
