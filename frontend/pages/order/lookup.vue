<template>
  <div class="lookup-page">
    <TheHeader />

    <main class="lookup-main">
      <div class="lookup-card">
        <div class="lookup-head">
          <div class="lookup-icon">
            <AppIcon name="download" :size="26" />
          </div>
          <h1>Akses Pesanan</h1>
          <p class="lookup-sub">
            Beli tanpa akun? Masukkan kode pesanan dan email yang Anda gunakan saat membeli.
            Kami akan mengirim tautan download ke email tersebut.
          </p>
        </div>

        <form class="lookup-form" @submit.prevent="onSubmit" novalidate>
          <div class="form-group">
            <label class="form-label" for="lookup-code">Kode Pesanan</label>
            <input
              id="lookup-code"
              v-model="orderCode"
              type="text"
              class="form-input"
              placeholder="Contoh: ABC123XYZ"
              autocomplete="off"
              :class="{ 'input-invalid': errors.orderCode }"
            />
            <span v-if="errors.orderCode" class="field-error">{{ errors.orderCode }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="lookup-email">Email</label>
            <input
              id="lookup-email"
              v-model="emailAddress"
              type="email"
              class="form-input"
              placeholder="nama@email.com"
              autocomplete="email"
              :class="{ 'input-invalid': errors.emailAddress }"
            />
            <span v-if="errors.emailAddress" class="field-error">{{ errors.emailAddress }}</span>
          </div>

          <button type="submit" class="btn btn-primary btn-full" :disabled="submitting">
            <span v-if="submitting" class="btn-spinner" />
            <span v-else>Kirim Tautan Akses</span>
          </button>
        </form>

        <div v-if="feedback" class="lookup-feedback" role="status">
          {{ feedback }}
        </div>

        <p class="lookup-note">
          Punya akun? <NuxtLink to="/auth" class="lookup-link">Masuk di sini</NuxtLink>
        </p>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { REQUEST_ORDER_ACCESS_LINK } from '~/graphql/mutations/guestCheckout'

useHead({
  title: 'Akses Pesanan - NgopiCode',
})

const orderCode = ref('')
const emailAddress = ref('')
const submitting = ref(false)
const feedback = ref('')

const errors = reactive<{ orderCode: string | null; emailAddress: string | null }>({
  orderCode: null,
  emailAddress: null,
})

function validate(): boolean {
  errors.orderCode = orderCode.value.trim() ? null : 'Kode pesanan wajib diisi'
  errors.emailAddress = !emailAddress.value.trim()
    ? 'Email wajib diisi'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.value.trim())
      ? null
      : 'Format email tidak valid'
  return !errors.orderCode && !errors.emailAddress
}

async function onSubmit() {
  feedback.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.mutate({
      mutation: REQUEST_ORDER_ACCESS_LINK,
      variables: {
        orderCode: orderCode.value.trim(),
        emailAddress: emailAddress.value.trim(),
      },
    })
    feedback.value =
      data?.requestOrderAccessLink?.message ||
      'Jika kode pesanan dan email cocok, kami telah mengirim tautan akses ke email Anda.'
  } catch {
    feedback.value = 'Terjadi kesalahan. Silakan coba lagi nanti.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.lookup-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.lookup-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
}

.lookup-card {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  box-shadow: 0 8px 32px var(--shadow-card);
}

.lookup-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}

.lookup-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  color: var(--primary-text);
}

.lookup-head h1 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
}

.lookup-sub {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.lookup-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
}

.input-invalid {
  border-color: #dc2626;
}

[data-theme='dark'] .input-invalid {
  border-color: #f87171;
}

.field-error {
  font-size: 0.78rem;
  color: #dc2626;
  line-height: 1.4;
}

[data-theme='dark'] .field-error {
  color: #fca5a5;
}

.lookup-feedback {
  margin-top: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-text);
  font-size: 0.88rem;
  line-height: 1.5;
}

.lookup-note {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.lookup-link {
  color: var(--primary-text);
  font-weight: 600;
  text-decoration: none;
}

.lookup-link:hover {
  text-decoration: underline;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: background 0.18s;
}

.btn-full {
  width: 100%;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .btn-spinner {
    animation: none;
  }
}
</style>
