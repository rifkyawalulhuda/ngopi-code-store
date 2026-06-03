import { UPDATE_CUSTOMER } from '~/graphql/mutations/auth'

/**
 * Composable for managing product wishlist.
 *
 * Storage strategy:
 * - Guest: localStorage only
 * - Logged-in: localStorage + synced to server (Customer custom field `wishlistProductIds`)
 *
 * On login: merges localStorage items with server data.
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
   * Load wishlist from server and merge with localStorage.
   * Call after login to sync across devices.
   */
  function loadFromServer(serverData: string | null | undefined) {
    if (!serverData) return

    try {
      const serverIds: string[] = JSON.parse(serverData)
      if (!Array.isArray(serverIds)) return

      // Merge: keep local items, add any server-only IDs as minimal items
      const localIds = new Set(items.value.map((i) => i.productId))
      const serverOnlyIds = serverIds.filter((id) => !localIds.has(id))

      // Server-only items get added as minimal placeholders
      // (they'll get full data when user visits the product page)
      for (const id of serverOnlyIds) {
        items.value.push({
          productId: id,
          name: 'Produk tersimpan',
          slug: '',
          price: 0,
          currencyCode: 'IDR',
          image: null,
          addedAt: Date.now(),
        })
      }

      // Also persist any local items that weren't on server
      if (serverOnlyIds.length > 0 || items.value.length > serverIds.length) {
        persistLocal()
        syncToServer()
      }
    } catch {
      // Invalid JSON, ignore
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
   * Clear entire wishlist.
   */
  function clearWishlist() {
    items.value = []
    persistLocal()

    const { isLoggedIn } = useAuth()
    if (isLoggedIn.value) {
      syncToServer()
    }
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
