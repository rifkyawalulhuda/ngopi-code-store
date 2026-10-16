import gql from 'graphql-tag'

const GET_OWNED_ITEMS = gql`
  query GetOwnedItems {
    activeCustomer {
      id
      orders(options: { filter: { state: { in: ["PaymentSettled", "Fulfilled", "Delivered"] } } }) {
        items {
          lines {
            productVariant {
              id
              productId
            }
          }
        }
      }
    }
  }
`

/**
 * Composable to check what the logged-in user already owns.
 *
 * Ownership is tracked at BOTH levels on purpose:
 *  - variant ids: the authoritative check. A product can have several license
 *    tiers; owning "Personal" must NOT hide the ability to buy "Extended".
 *  - product ids: kept for "you own something from this product" messaging.
 *
 * Tracking only product ids was a revenue blocker: buying one tier marked the
 * whole product owned and the buy button disappeared.
 */
export function useOwnedProducts() {
  const ownedProductIds = useState<Set<string>>('owned-products.ids', () => new Set())
  const ownedVariantIds = useState<Set<string>>('owned-variants.ids', () => new Set())
  const loaded = useState<boolean>('owned-products.loaded', () => false)

  async function fetchOwnedProducts() {
    if (loaded.value) return
    if (!import.meta.client) return

    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_OWNED_ITEMS,
        fetchPolicy: 'network-only',
      })

      const orders = data?.activeCustomer?.orders?.items || []
      const productIds = new Set<string>()
      const variantIds = new Set<string>()
      for (const order of orders) {
        for (const line of order.lines || []) {
          const variant = line.productVariant
          if (variant?.id) variantIds.add(String(variant.id))
          if (variant?.productId) productIds.add(String(variant.productId))
        }
      }
      ownedProductIds.value = productIds
      ownedVariantIds.value = variantIds
    } catch {
      // Silent fail — the PDP simply won't show the owned banner.
    } finally {
      loaded.value = true
    }
  }

  /** True when the customer owns this exact variant (e.g. this license tier). */
  function isVariantOwned(variantId: string | null | undefined): boolean {
    if (!variantId) return false
    return ownedVariantIds.value.has(String(variantId))
  }

  /** True when the customer owns any variant of this product. */
  function isOwned(productId: string | null | undefined): boolean {
    if (!productId) return false
    return ownedProductIds.value.has(String(productId))
  }

  return {
    ownedProductIds,
    ownedVariantIds,
    loaded,
    fetchOwnedProducts,
    isVariantOwned,
    isOwned,
  }
}
