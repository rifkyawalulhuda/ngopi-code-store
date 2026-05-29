import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '~/stores/cart'

// Mock Apollo client
const mockQuery = vi.fn()
const mockMutate = vi.fn()

// Mock useNuxtApp as a global (Nuxt auto-import)
vi.stubGlobal('useNuxtApp', () => ({
  $apollo: {
    defaultClient: {
      query: mockQuery,
      mutate: mockMutate,
    },
  },
}))

import { useCart } from './useCart'

describe('useCart', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty cart initially', () => {
      const { cart, cartItemCount, cartTotal, isEmpty } = useCart()

      expect(cart.value.lines).toEqual([])
      expect(cartItemCount.value).toBe(0)
      expect(cartTotal.value).toBe(0)
      expect(isEmpty.value).toBe(true)
    })
  })

  describe('fetchCart', () => {
    it('should fetch and populate cart from active order', async () => {
      mockQuery.mockResolvedValue({
        data: {
          activeOrder: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 2,
            subTotal: 300000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Nuxt Starter Kit' },
                quantity: 2,
                unitPrice: 150000,
                linePrice: 300000,
              },
            ],
          },
        },
      })

      const { fetchCart, cart, cartItemCount, cartTotal, isEmpty } = useCart()
      await fetchCart()

      expect(cart.value.id).toBe('order-1')
      expect(cart.value.lines).toHaveLength(1)
      expect(cart.value.lines[0].productName).toBe('Nuxt Starter Kit')
      expect(cartItemCount.value).toBe(2)
      expect(cartTotal.value).toBe(300000)
      expect(isEmpty.value).toBe(false)
    })

    it('should clear cart when no active order exists', async () => {
      mockQuery.mockResolvedValue({
        data: { activeOrder: null },
      })

      const { fetchCart, isEmpty } = useCart()
      await fetchCart()

      expect(isEmpty.value).toBe(true)
    })

    it('should set error on fetch failure', async () => {
      mockQuery.mockRejectedValue(new Error('Network error'))

      const { fetchCart, cart } = useCart()
      await fetchCart()

      expect(cart.value.error).toBe('Network error')
    })
  })

  describe('addToCart', () => {
    it('should add item to cart and update store', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addItemToOrder: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 1,
            subTotal: 150000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Nuxt Starter Kit' },
                quantity: 1,
                unitPrice: 150000,
                linePrice: 150000,
              },
            ],
          },
        },
      })

      const { addToCart, cart, cartItemCount } = useCart()
      await addToCart('variant-1', 1)

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: { productVariantId: 'variant-1', quantity: 1 },
      })
      expect(cart.value.lines).toHaveLength(1)
      expect(cartItemCount.value).toBe(1)
    })

    it('should enforce minimum quantity of 1', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addItemToOrder: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 1,
            subTotal: 150000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Test' },
                quantity: 1,
                unitPrice: 150000,
                linePrice: 150000,
              },
            ],
          },
        },
      })

      const { addToCart } = useCart()
      await addToCart('variant-1', 0)

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: { productVariantId: 'variant-1', quantity: 1 },
      })
    })

    it('should enforce minimum quantity of 1 for negative values', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addItemToOrder: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 1,
            subTotal: 150000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Test' },
                quantity: 1,
                unitPrice: 150000,
                linePrice: 150000,
              },
            ],
          },
        },
      })

      const { addToCart } = useCart()
      await addToCart('variant-1', -5)

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: { productVariantId: 'variant-1', quantity: 1 },
      })
    })

    it('should handle error result from addItemToOrder', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addItemToOrder: {
            errorCode: 'INSUFFICIENT_STOCK_ERROR',
            message: 'Not enough stock',
          },
        },
      })

      const { addToCart, cart } = useCart()
      await addToCart('variant-1', 1)

      expect(cart.value.error).toBe('Not enough stock')
    })

    it('should handle network error on add', async () => {
      mockMutate.mockRejectedValue(new Error('Connection refused'))

      const { addToCart, cart } = useCart()
      await addToCart('variant-1', 1)

      expect(cart.value.error).toBe('Connection refused')
    })
  })

  describe('updateQuantity', () => {
    it('should update line item quantity', async () => {
      mockMutate.mockResolvedValue({
        data: {
          adjustOrderLine: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 3,
            subTotal: 450000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Nuxt Starter Kit' },
                quantity: 3,
                unitPrice: 150000,
                linePrice: 450000,
              },
            ],
          },
        },
      })

      const { updateQuantity, cartItemCount, cartTotal } = useCart()
      await updateQuantity('line-1', 3)

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: { orderLineId: 'line-1', quantity: 3 },
      })
      expect(cartItemCount.value).toBe(3)
      expect(cartTotal.value).toBe(450000)
    })

    it('should enforce minimum quantity of 1 on update', async () => {
      mockMutate.mockResolvedValue({
        data: {
          adjustOrderLine: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 1,
            subTotal: 150000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Test' },
                quantity: 1,
                unitPrice: 150000,
                linePrice: 150000,
              },
            ],
          },
        },
      })

      const { updateQuantity } = useCart()
      await updateQuantity('line-1', 0)

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: { orderLineId: 'line-1', quantity: 1 },
      })
    })

    it('should handle error result from adjustOrderLine', async () => {
      mockMutate.mockResolvedValue({
        data: {
          adjustOrderLine: {
            errorCode: 'ORDER_MODIFICATION_ERROR',
            message: 'Cannot modify order',
          },
        },
      })

      const { updateQuantity, cart } = useCart()
      await updateQuantity('line-1', 5)

      expect(cart.value.error).toBe('Cannot modify order')
    })
  })

  describe('removeFromCart', () => {
    it('should remove line item from cart', async () => {
      mockMutate.mockResolvedValue({
        data: {
          removeOrderLine: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 0,
            subTotal: 0,
            lines: [],
          },
        },
      })

      const { removeFromCart, isEmpty } = useCart()
      await removeFromCart('line-1')

      expect(mockMutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: { orderLineId: 'line-1' },
      })
      expect(isEmpty.value).toBe(true)
    })

    it('should handle error result from removeOrderLine', async () => {
      mockMutate.mockResolvedValue({
        data: {
          removeOrderLine: {
            errorCode: 'ORDER_MODIFICATION_ERROR',
            message: 'Cannot remove item',
          },
        },
      })

      const { removeFromCart, cart } = useCart()
      await removeFromCart('line-1')

      expect(cart.value.error).toBe('Cannot remove item')
    })
  })

  describe('loading state', () => {
    it('should not be loading after addToCart completes', async () => {
      mockMutate.mockResolvedValue({
        data: {
          addItemToOrder: {
            id: 'order-1',
            code: 'ORD001',
            totalQuantity: 1,
            subTotal: 100000,
            lines: [
              {
                id: 'line-1',
                productVariant: { id: 'variant-1', name: 'Test' },
                quantity: 1,
                unitPrice: 100000,
                linePrice: 100000,
              },
            ],
          },
        },
      })

      const { addToCart, cart } = useCart()
      await addToCart('variant-1', 1)

      expect(cart.value.loading).toBe(false)
    })

    it('should not be loading after error', async () => {
      mockMutate.mockRejectedValue(new Error('fail'))

      const { addToCart, cart } = useCart()
      await addToCart('variant-1', 1)

      expect(cart.value.loading).toBe(false)
    })
  })
})
