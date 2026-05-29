<template>
  <div class="checkout-page">
    <h1>Checkout</h1>

    <!-- Empty Cart State -->
    <div v-if="isEmpty" class="empty-cart">
      <p>Your cart is empty.</p>
      <NuxtLink to="/products">Browse Products</NuxtLink>
    </div>

    <div v-else class="checkout-content">
      <!-- Cart Summary -->
      <section class="cart-summary">
        <h2>Order Summary</h2>
        <ul class="cart-items">
          <li v-for="item in cart.lines" :key="item.id" class="cart-item">
            <span class="item-name">{{ item.productName }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span class="item-price">{{ formatPriceIDR(item.linePrice) }}</span>
          </li>
        </ul>
        <div class="cart-total">
          <strong>Total:</strong>
          <span>{{ formatPriceIDR(cart.subTotal) }}</span>
        </div>
      </section>

      <!-- Guest Checkout Form -->
      <section class="customer-form">
        <h2>Customer Information</h2>
        <form @submit.prevent="handleCustomerSubmit" novalidate>
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="customerInput.email"
              type="email"
              maxlength="254"
              placeholder="your@email.com"
              :class="{ 'input-error': validationErrors.email }"
              @blur="touchField('email')"
            />
            <span v-if="touchedFields.email && validationErrors.email" class="error-message">
              {{ validationErrors.email }}
            </span>
          </div>

          <div class="form-group">
            <label for="firstName">First Name</label>
            <input
              id="firstName"
              v-model="customerInput.firstName"
              type="text"
              maxlength="100"
              placeholder="First name"
              :class="{ 'input-error': validationErrors.firstName }"
              @blur="touchField('firstName')"
            />
            <span v-if="touchedFields.firstName && validationErrors.firstName" class="error-message">
              {{ validationErrors.firstName }}
            </span>
          </div>

          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input
              id="lastName"
              v-model="customerInput.lastName"
              type="text"
              maxlength="100"
              placeholder="Last name"
              :class="{ 'input-error': validationErrors.lastName }"
              @blur="touchField('lastName')"
            />
            <span v-if="touchedFields.lastName && validationErrors.lastName" class="error-message">
              {{ validationErrors.lastName }}
            </span>
          </div>

          <button
            type="submit"
            :disabled="!canSubmitCustomer || checkoutState.loading"
            class="btn-primary"
          >
            {{ checkoutState.customerSet ? 'Information Saved ✓' : 'Save Information' }}
          </button>
        </form>
      </section>

      <!-- Payment Methods -->
      <section class="payment-methods" v-if="checkoutState.customerSet">
        <h2>Payment Method</h2>

        <div v-if="checkoutState.loading" class="loading">
          Loading payment methods...
        </div>

        <div v-else-if="checkoutState.availablePaymentMethods.length === 0" class="no-methods">
          <p>No payment methods available. Please try again later.</p>
        </div>

        <ul v-else class="method-list">
          <li
            v-for="method in checkoutState.availablePaymentMethods"
            :key="method.id"
            class="method-item"
            :class="{
              selected: checkoutState.selectedPaymentMethod === method.code,
              disabled: !method.isEligible,
            }"
          >
            <label :for="`payment-${method.code}`" class="method-label">
              <input
                :id="`payment-${method.code}`"
                type="radio"
                name="paymentMethod"
                :value="method.code"
                :disabled="!method.isEligible"
                :checked="checkoutState.selectedPaymentMethod === method.code"
                @change="selectPaymentMethod(method.code)"
              />
              <span class="method-name">{{ method.name }}</span>
              <span v-if="method.description" class="method-description">
                {{ method.description }}
              </span>
              <span v-if="!method.isEligible && method.eligibilityMessage" class="method-ineligible">
                {{ method.eligibilityMessage }}
              </span>
            </label>
          </li>
        </ul>
      </section>

      <!-- Error Display -->
      <div v-if="checkoutState.error" class="checkout-error">
        <p>{{ checkoutState.error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useCart } from '~/composables/useCart'
import {
  useCheckout,
  validateCheckoutForm,
  isFormValid,
  type CheckoutCustomerInput,
  type CheckoutValidationErrors,
} from '~/composables/useCheckout'
import { formatPriceIDR } from '~/utils/format'

useHead({
  title: 'Checkout - NgopiCode Digital Store',
})

const { cart, isEmpty, fetchCart } = useCart()
const {
  availablePaymentMethods,
  selectedPaymentMethod,
  loading,
  error,
  customerSet,
  fetchPaymentMethods,
  setCustomerForOrder,
  selectPaymentMethod,
} = useCheckout()

const checkoutState = reactive({
  availablePaymentMethods,
  selectedPaymentMethod,
  loading,
  error,
  customerSet,
})

const customerInput = reactive<CheckoutCustomerInput>({
  email: '',
  firstName: '',
  lastName: '',
})

const touchedFields = reactive({
  email: false,
  firstName: false,
  lastName: false,
})

const validationErrors = computed<CheckoutValidationErrors>(() =>
  validateCheckoutForm(customerInput)
)

const canSubmitCustomer = computed(() => isFormValid(validationErrors.value))

function touchField(field: 'email' | 'firstName' | 'lastName') {
  touchedFields[field] = true
}

async function handleCustomerSubmit() {
  // Touch all fields to show errors
  touchedFields.email = true
  touchedFields.firstName = true
  touchedFields.lastName = true

  if (!canSubmitCustomer.value) return

  await setCustomerForOrder(customerInput)

  // After setting customer, fetch payment methods
  if (customerSet.value) {
    await fetchPaymentMethods()
  }
}

onMounted(async () => {
  await fetchCart()
})
</script>
