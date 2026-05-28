import { defineStore } from 'pinia'

export interface CartLineItem {
  id: string
  productVariantId: string
  productName: string
  quantity: number
  unitPrice: number
  linePrice: number
}

export interface CartState {
  activeOrderId: string | null
  lines: CartLineItem[]
  totalQuantity: number
  subTotal: number
  loading: boolean
  error: string | null
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    activeOrderId: null,
    lines: [],
    totalQuantity: 0,
    subTotal: 0,
    loading: false,
    error: null,
  }),

  getters: {
    isEmpty: (state) => state.lines.length === 0,
    itemCount: (state) => state.totalQuantity,
  },

  actions: {
    setActiveOrder(order: { id: string; lines: CartLineItem[]; totalQuantity: number; subTotal: number }) {
      this.activeOrderId = order.id
      this.lines = order.lines
      this.totalQuantity = order.totalQuantity
      this.subTotal = order.subTotal
    },

    clearCart() {
      this.activeOrderId = null
      this.lines = []
      this.totalQuantity = 0
      this.subTotal = 0
      this.error = null
    },

    setLoading(loading: boolean) {
      this.loading = loading
    },

    setError(error: string | null) {
      this.error = error
    },
  },
})
