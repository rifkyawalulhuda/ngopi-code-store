<template>
  <div class="order-confirmation-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <p>Loading order details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <h1>Order Not Found</h1>
      <p>{{ error }}</p>
      <NuxtLink to="/products" class="btn-primary">Browse Products</NuxtLink>
    </div>

    <!-- Success State -->
    <div v-else-if="isSuccess && order" class="success-state">
      <div class="success-header">
        <span class="success-icon" aria-hidden="true">✓</span>
        <h1>Payment Successful!</h1>
        <p class="success-subtitle">
          Thank you for your purchase. Your order <strong>{{ order.code }}</strong> has been confirmed.
        </p>
      </div>

      <section class="order-details">
        <h2>Order Summary</h2>
        <ul class="order-items">
          <li v-for="item in order.lines" :key="item.id" class="order-item">
            <span class="item-name">{{ item.productName }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span class="item-price">{{ formatPriceIDR(item.linePrice) }}</span>
          </li>
        </ul>
        <div class="order-total">
          <strong>Total:</strong>
          <span>{{ formatPriceIDR(order.total) }}</span>
        </div>
      </section>

      <section class="download-section">
        <h2>Download Your Products</h2>
        <p>Your digital products are ready for download.</p>
        <NuxtLink :to="`/downloads/${order.code}`" class="btn-primary btn-download">
          Go to Download Page
        </NuxtLink>
        <p class="download-note">
          A confirmation email has been sent to <strong>{{ order.customerEmail }}</strong> with download instructions.
        </p>
      </section>
    </div>

    <!-- Failed/Expired State -->
    <div v-else-if="isFailed && order" class="failed-state">
      <div class="failed-header">
        <span class="failed-icon" aria-hidden="true">✗</span>
        <h1>Payment Not Completed</h1>
        <p class="failed-subtitle">
          Your payment for order <strong>{{ order.code }}</strong>
          {{ paymentStatus === 'expired' ? 'has expired' : 'could not be processed' }}.
        </p>
      </div>

      <section class="order-details">
        <h2>Order Summary</h2>
        <ul class="order-items">
          <li v-for="item in order.lines" :key="item.id" class="order-item">
            <span class="item-name">{{ item.productName }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span class="item-price">{{ formatPriceIDR(item.linePrice) }}</span>
          </li>
        </ul>
        <div class="order-total">
          <strong>Total:</strong>
          <span>{{ formatPriceIDR(order.total) }}</span>
        </div>
      </section>

      <section class="retry-section">
        <p>You can retry the payment or choose a different payment method.</p>
        <NuxtLink to="/checkout" class="btn-primary btn-retry">
          Retry Checkout
        </NuxtLink>
        <NuxtLink to="/products" class="btn-secondary">
          Continue Shopping
        </NuxtLink>
      </section>
    </div>

    <!-- Pending State -->
    <div v-else-if="isPending && order" class="pending-state">
      <div class="pending-header">
        <span class="pending-icon" aria-hidden="true">⏳</span>
        <h1>Payment Pending</h1>
        <p class="pending-subtitle">
          Your payment for order <strong>{{ order.code }}</strong> is being processed.
          Please complete the payment to receive your download links.
        </p>
      </div>

      <section class="order-details">
        <h2>Order Summary</h2>
        <ul class="order-items">
          <li v-for="item in order.lines" :key="item.id" class="order-item">
            <span class="item-name">{{ item.productName }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span class="item-price">{{ formatPriceIDR(item.linePrice) }}</span>
          </li>
        </ul>
        <div class="order-total">
          <strong>Total:</strong>
          <span>{{ formatPriceIDR(order.total) }}</span>
        </div>
      </section>

      <section class="pending-actions">
        <p>If you have already completed the payment, please wait a moment and refresh this page.</p>
        <button class="btn-primary" @click="refreshOrder">
          Refresh Status
        </button>
      </section>
    </div>

    <!-- Unknown State (no order loaded yet or unrecognized status) -->
    <div v-else class="unknown-state">
      <h1>Order Status</h1>
      <p>Unable to determine the payment status. Please check your email for order confirmation.</p>
      <NuxtLink to="/products" class="btn-primary">Browse Products</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOrderConfirmation } from '~/composables/useOrderConfirmation'
import { formatPriceIDR } from '~/utils/format'

const route = useRoute()

const {
  order,
  loading,
  error,
  paymentStatus,
  isSuccess,
  isFailed,
  isPending,
  fetchOrderByCode,
} = useOrderConfirmation()

useHead({
  title: 'Order Confirmation - NgopiCode Digital Store',
})

async function refreshOrder() {
  const code = route.params.code as string
  const status = route.query.status as string | undefined
  await fetchOrderByCode(code, status)
}

onMounted(async () => {
  const code = route.params.code as string
  const status = route.query.status as string | undefined
  await fetchOrderByCode(code, status)
})
</script>

<style scoped>
.order-confirmation-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.loading-state {
  text-align: center;
  padding: 3rem 0;
}

/* Success State */
.success-header {
  text-align: center;
  margin-bottom: 2rem;
}

.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #d4edda;
  color: #155724;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.success-subtitle {
  color: #555;
  margin-top: 0.5rem;
}

/* Failed State */
.failed-header {
  text-align: center;
  margin-bottom: 2rem;
}

.failed-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #f8d7da;
  color: #721c24;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.failed-subtitle {
  color: #555;
  margin-top: 0.5rem;
}

/* Pending State */
.pending-header {
  text-align: center;
  margin-bottom: 2rem;
}

.pending-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #fff3cd;
  color: #856404;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.pending-subtitle {
  color: #555;
  margin-top: 0.5rem;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 3rem 0;
}

/* Order Details */
.order-details {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.order-items {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.order-item:last-child {
  border-bottom: none;
}

.item-name {
  flex: 1;
}

.item-qty {
  margin: 0 1rem;
  color: #666;
}

.item-price {
  font-weight: 500;
}

.order-total {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 2px solid #dee2e6;
  font-size: 1.1rem;
}

/* Download Section */
.download-section {
  text-align: center;
  margin-bottom: 2rem;
}

.btn-download {
  display: inline-block;
  margin: 1rem 0;
}

.download-note {
  font-size: 0.9rem;
  color: #666;
  margin-top: 1rem;
}

/* Retry Section */
.retry-section {
  text-align: center;
}

.btn-retry {
  display: inline-block;
  margin: 1rem 0.5rem;
}

/* Pending Actions */
.pending-actions {
  text-align: center;
}

/* Buttons */
.btn-primary {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

/* Unknown State */
.unknown-state {
  text-align: center;
  padding: 3rem 0;
}
</style>
