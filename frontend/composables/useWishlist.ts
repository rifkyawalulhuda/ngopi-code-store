import { UPDATE_CUSTOMER } from '~/graphql/mutations/auth'
import { GET_PRODUCTS } from '~/graphql/queries/products'

/**
 * Composable for managing product wishlist.
 *
 * Storage strategy:
 * - Guest: localStorage only
 * - Logged-in: localStorage + synced to server (Customer custom field `wishlistProductIds`)
 *
 * On login: fetches product data from server using stored IDs, rebuilds full wishlist.
 * On toggle: persists to both localStorage and server (if logged in).
 */
export interface WishlistItem {
  productId: string
  variantId?: string
  name: string
  slug: string
  price: number
  currencyCode: string
  image: string | null
  addedAt: number
}

const STORAGE_KEY = 'ngopicode_wishlist'

export function useWishlist() {
  const items = useState<WishlistItem[]>('wishlist.items', () => [])
  const initialized = useState<boolean>('wishlist.initialized', () => false)

  /**
   * Load wishlist from localStorage. Safe to call multiple times.
   */
  function init() {
    if (initialized.value) return
    if (!import.meta.client) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        items.value = JSON.parse(stored)
      }
    } catch {
      items.value = []
    }
    initialized.value = true
  }

  /**
   * Persist current state to localStorage.
   */
  function persistLocal() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Sync wishlist product IDs to server (Customer custom field).
   * Only works when user is logged in.
   */
  async function syncToServer() {
    try {
      const { $apollo } = useNuxtApp()
      const productIds = items.value.map((i) => i.productId)
      await $apollo.defaultClient.mutate({
        mutation: UPDATE_CUSTOMER,
        variables: {
          input: {
            customFields: {
              wishlistProductIds: JSON.stringify(productIds),
            },
          },
        },
      })
    } catch {
      // Silent fail — localStorage is the fallback
    }
  }

  /**
   * Load wishlist from server: fetch full product data for stored IDs.
   * Call after login to rebuild wishlist with complete product info.
   */
  async function loadFromServer(serverData: string | null | undefined) {
    if (!serverData) return

    try {
      const serverIds: string[] = JSON.parse(serverData)
      if (!Array.isArray(serverIds) || serverIds.length === 0) return

      // Fetch full product data from Vendure
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_PRODUCTS,
        variables: {
          options: {
            filter: { id: { in: serverIds } },
            take: serverIds.length,
          },
        },
        fetchPolicy: 'network-only',
      })

      const products = data?.products?.items || []

      // Build full wishlist items from fetched product data
      const fetchedItems: WishlistItem[] = products.map((p: any) => ({
        productId: p.id,
        variantId: p.variants?.[0]?.id,
        name: p.name,
        slug: p.slug,
        price: p.variants?.[0]?.price ?? 0,
        currencyCode: p.variants?.[0]?.currencyCode ?? 'IDR',
        image: p.featuredAsset?.preview || null,
        addedAt: Date.now(),
      }))

      // Merge: server items take priority (they have fresh data)
      // Keep any local-only items that aren't on server
      const serverIdSet = new Set(serverIds)
      const localOnlyItems = items.value.filter((i) => !serverIdSet.has(i.productId))

      items.value = [...fetchedItems, ...localOnlyItems]
      persistLocal()

      // If there were local-only items, sync them back to server
      if (localOnlyItems.length > 0) {
        syncToServer()
      }
    } catch {
      // If fetch fails, leave current state as-is
    }
  }

  /**
   * Check if a product is in the wishlist.
   */
  function isInWishlist(productId: string): boolean {
    return items.value.some((item) => item.productId === productId)
  }

  /**
   * Add a product to the wishlist.
   */
  function addToWishlist(item: Omit<WishlistItem, 'addedAt'>) {
    if (isInWishlist(item.productId)) return

    items.value = [
      { ...item, addedAt: Date.now() },
      ...items.value,
    ]
    persistLocal()

    const { isLoggedIn } = useAuth()
    if (isLoggedIn.value) {
      syncToServer()
    }
  }

  /**
   * Remove a product from the wishlist.
   */
  function removeFromWishlist(productId: string) {
    items.value = items.value.filter((item) => item.productId !== productId)
    persistLocal()

    const { isLoggedIn } = useAuth()
    if (isLoggedIn.value) {
      syncToServer()
    }
  }

  /**
   * Toggle a product in the wishlist.
   * Returns true if added, false if removed.
   */
  function toggleWishlist(item: Omit<WishlistItem, 'addedAt'>): boolean {
    if (isInWishlist(item.productId)) {
      removeFromWishlist(item.productId)
      return false
    } else {
      addToWishlist(item)
      return true
    }
  }

  /**
   * Clear entire wishlist (used on logout).
   */
  function clearWishlist() {
    items.value = []
    persistLocal()
  }

  const count = computed(() => items.value.length)

  return {
    items,
    count,
    init,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    loadFromServer,
    syncToServer,
  }
}
