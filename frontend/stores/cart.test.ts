import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart'

describe('Cart Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty state', () => {
    const cart = useCartStore()
    expect(cart.activeOrderId).toBeNull()
    expect(cart.lines).toEqual([])
    expect(cart.totalQuantity).toBe(0)
    expect(cart.subTotal).toBe(0)
    expect(cart.loading).toBe(false)
    expect(cart.error).toBeNull()
  })

  it('should report isEmpty as true when no items', () => {
    const cart = useCartStore()
    expect(cart.isEmpty).toBe(true)
  })

  it('should set active order correctly', () => {
    const cart = useCartStore()
    const order = {
      id: 'order-1',
      lines: [
        {
          id: 'line-1',
          productVariantId: 'variant-1',
          productName: 'Nuxt Starter Kit',
          quantity: 1,
          unitPrice: 150000,
          linePrice: 150000,
        },
      ],
      totalQuantity: 1,
      subTotal: 150000,
    }

    cart.setActiveOrder(order)

    expect(cart.activeOrderId).toBe('order-1')
    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0].productName).toBe('Nuxt Starter Kit')
    expect(cart.totalQuantity).toBe(1)
    expect(cart.subTotal).toBe(150000)
    expect(cart.isEmpty).toBe(false)
    expect(cart.itemCount).toBe(1)
  })

  it('should clear cart', () => {
    const cart = useCartStore()
    cart.setActiveOrder({
      id: 'order-1',
      lines: [
        {
          id: 'line-1',
          productVariantId: 'variant-1',
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 100000,
          linePrice: 200000,
        },
      ],
      totalQuantity: 2,
      subTotal: 200000,
    })

    cart.clearCart()

    expect(cart.activeOrderId).toBeNull()
    expect(cart.lines).toEqual([])
    expect(cart.totalQuantity).toBe(0)
    expect(cart.subTotal).toBe(0)
    expect(cart.isEmpty).toBe(true)
  })

  it('should set loading state', () => {
    const cart = useCartStore()
    cart.setLoading(true)
    expect(cart.loading).toBe(true)
    cart.setLoading(false)
    expect(cart.loading).toBe(false)
  })

  it('should set error state', () => {
    const cart = useCartStore()
    cart.setError('Network error')
    expect(cart.error).toBe('Network error')
    cart.setError(null)
    expect(cart.error).toBeNull()
  })
})
