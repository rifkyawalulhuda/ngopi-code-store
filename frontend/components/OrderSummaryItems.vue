<template>
  <div class="osi">
    <h3 class="osi-title">Ringkasan Pesanan</h3>
    <ul class="osi-list">
      <li v-for="item in order.lines" :key="item.id" class="osi-item">
        <span class="osi-name">{{ item.productName }}</span>
        <span class="osi-qty">x{{ item.quantity }}</span>
        <span class="osi-price">{{ formatPriceIDR(item.linePrice) }}</span>
      </li>
    </ul>
    <div class="osi-total">
      <span>Total</span>
      <span class="osi-total-value">{{ formatPriceIDR(order.total) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPriceIDR } from '~/utils/format'

defineProps<{
  order: {
    total: number
    lines: Array<{
      id: string
      productName: string
      quantity: number
      linePrice: number
    }>
  }
}>()
</script>

<style scoped>
.osi-title {
  font-size: 0.92rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.osi-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.osi-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.88rem;
}

.osi-item:last-child { border-bottom: none; }

.osi-name { flex: 1; font-weight: 500; }
.osi-qty { color: var(--text-muted); margin: 0 0.75rem; }
.osi-price { font-weight: 600; font-variant-numeric: tabular-nums; }

.osi-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
  font-weight: 700;
}

.osi-total-value {
  color: var(--primary-text);
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}
</style>
