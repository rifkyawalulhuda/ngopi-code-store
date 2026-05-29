import { computed } from 'vue'
import { useCartStore } from '~/stores/cart'
import type { CartLineItem } from '~/stores/cart'
import { ADD_ITEM_TO_ORDER, ADJUST_ORDER_LINE, REMOVE_ORDER_LINE } from '~/graphql/mutations'
import { GET_ACTIVE_ORDER } from '~/graphql/queries'

function mapOrderToCartState(order: any) {
  return {
    id: order.id,
    lines: order.lines.map((line: any) => ({
      id: line.id,
      productVariantId: line.productVariant.id,
      productName: line.productVariant.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      linePrice: line.linePrice,
    })),
    totalQuantity: order.totalQuantity,
    subTotal: order.subTotal,
  }
}

export function useCart() {
  const cartStore = useCartStore()

  const cart = computed(() => ({
    id: cartStore.activeOrderId,
    lines: cartStore.lines,
    totalQuantity: cartStore.totalQuantity,
    subTotal: cartStore.subTotal,
    loading: cartStore.loading,
    error: cartStore.error,
  }))

  const cartItemCount = computed(() => cartStore.totalQuantity)
  const cartTotal = computed(() => cartStore.subTotal)
  const isEmpty = computed(() => cartStore.isEmpty)

  async function fetchCart() {
    const { $apollo } = useNuxtApp()
    cartStore.setLoading(true)
    cartStore.setError(null)

    try {
      const { data } = await $apollo.defaultClient.query({
        query: GET_ACTIVE_ORDER,
        fetchPolicy: 'network-only',
      })

      if (data.activeOrder) {
        cartStore.setActiveOrder(mapOrderToCartState(data.activeOrder))
      } else {
        cartStore.clearCart()
      }
    } catch (err: any) {
      cartStore.setError(err.message || 'Failed to fetch cart')
    } finally {
      cartStore.setLoading(false)
    }
  }

  async function addToCart(productVariantId: string, quantity: number) {
    const validQuantity = Math.max(1, Math.round(quantity))

    const { $apollo } = useNuxtApp()
    cartStore.setLoading(true)
    cartStore.setError(null)

    try {
      const { data } = await $apollo.defaultClient.mutate({
        mutation: ADD_ITEM_TO_ORDER,
        variables: { productVariantId, quantity: validQuantity },
      })

      const result = data.addItemToOrder

      if (result.__typename === 'Order' || result.id) {
        cartStore.setActiveOrder(mapOrderToCartState(result))
      } else if (result.errorCode) {
        cartStore.setError(result.message || 'Failed to add item to cart')
      }
    } catch (err: any) {
      cartStore.setError(err.message || 'Failed to add item to cart')
    } finally {
      cartStore.setLoading(false)
    }
  }

  async function updateQuantity(orderLineId: string, quantity: number) {
    const validQuantity = Math.max(1, Math.round(quantity))

    const { $apollo } = useNuxtApp()
    cartStore.setLoading(true)
    cartStore.setError(null)

    try {
      const { data } = await $apollo.defaultClient.mutate({
        mutation: ADJUST_ORDER_LINE,
        variables: { orderLineId, quantity: validQuantity },
      })

      const result = data.adjustOrderLine

      if (result.__typename === 'Order' || result.id) {
        cartStore.setActiveOrder(mapOrderToCartState(result))
      } else if (result.errorCode) {
        cartStore.setError(result.message || 'Failed to update quantity')
      }
    } catch (err: any) {
      cartStore.setError(err.message || 'Failed to update quantity')
    } finally {
      cartStore.setLoading(false)
    }
  }

  async function removeFromCart(orderLineId: string) {
    const { $apollo } = useNuxtApp()
    cartStore.setLoading(true)
    cartStore.setError(null)

    try {
      const { data } = await $apollo.defaultClient.mutate({
        mutation: REMOVE_ORDER_LINE,
        variables: { orderLineId },
      })

      const result = data.removeOrderLine

      if (result.__typename === 'Order' || result.id) {
        cartStore.setActiveOrder(mapOrderToCartState(result))
      } else if (result.errorCode) {
        cartStore.setError(result.message || 'Failed to remove item')
      }
    } catch (err: any) {
      cartStore.setError(err.message || 'Failed to remove item')
    } finally {
      cartStore.setLoading(false)
    }
  }

  return {
    cart,
    cartItemCount,
    cartTotal,
    isEmpty,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
  }
}
