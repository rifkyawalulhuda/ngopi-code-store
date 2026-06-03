import gql from 'graphql-tag'

const GET_ACTIVE_ORDERS = gql`
  query GetActiveCustomerOrders {
    activeCustomer {
      id
      orders(options: { filter: { state: { eq: "ArrangingPayment" } }, take: 1 }) {
        totalItems
      }
    }
  }
`

/**
 * Shared state for tracking if the logged-in user has pending orders.
 * Used by TheHeader to show notification badge on user icon.
 */
export function usePendingOrders() {
  const hasPending = useState<boolean>('pending-orders.has', () => false)
  const count = useState<number>('pending-orders.count', () => 0)
  const checked = useState<boolean>('pending-orders.checked', () => false)

  async function checkPendingOrders() {
    if (!import.meta.client) return

    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_ACTIVE_ORDERS,
        fetchPolicy: 'network-only',
      })

      const totalItems = data?.activeCustomer?.orders?.totalItems ?? 0
      hasPending.value = totalItems > 0
      count.value = totalItems
    } catch {
      hasPending.value = false
      count.value = 0
    } finally {
      checked.value = true
    }
  }

  return {
    hasPending,
    count,
    checked,
    checkPendingOrders,
  }
}
