import gql from 'graphql-tag'

const GET_OWNED_PRODUCT_IDS = gql`
  query GetOwnedProductIds {
    activeCustomer {
      id
      orders(options: { filter: { state: { in: ["PaymentSettled", "Fulfilled", "Delivered"] } } }) {
        items {
          lines {
            productVariant {
              productId
            }
          }
        }
      }
    }
  }
`

/**
 * Composable to check if the logged-in user already owns a specific product.
 * "Owns" = has a paid/fulfilled order containing that product.
 */
export function useOwnedProducts() {
  const ownedIds = useState<Set<string>>('owned-products.ids', () => new Set())
  const loaded = useState<boolean>('owned-products.loaded', () => false)

  async function fetchOwnedProducts() {
    if (loaded.value) return
    if (!import.meta.client) return

    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_OWNED_PRODUCT_IDS,
        fetchPolicy: 'network-only',
      })

      const orders = data?.activeCustomer?.orders?.items || []
      const ids = new Set<string>()
      for (const order of orders) {
        for (const line of order.lines || []) {
          if (line.productVariant?.productId) {
            ids.add(line.productVariant.productId)
          }
        }
      }
      ownedIds.value = ids
    } catch {
      // Silent fail
    } finally {
      loaded.value = true
    }
  }

  function isOwned(productId: string): boolean {
    return ownedIds.value.has(productId)
  }

  return {
    ownedIds,
    loaded,
    fetchOwnedProducts,
    isOwned,
  }
}
