<template>
  <div class="access-page">
    <TheHeader />

    <main class="access-main">
      <div class="access-card">
        <!-- Loading state -->
        <div v-if="loading" class="access-state">
          <div class="access-spinner" />
          <h2>Membuka pesanan...</h2>
          <p>Mohon tunggu sebentar.</p>
        </div>

        <!-- Success state -->
        <div v-else-if="succeeded" class="access-state">
          <div class="access-icon access-icon-success">
            <AppIcon name="check" :size="32" />
          </div>
          <h2>Akses Berhasil</h2>
          <p>Pesanan Anda sudah terbuka. Mengalihkan ke halaman download...</p>
          <NuxtLink v-if="orderCode" :to="`/downloads/${orderCode}?claim=1`" class="btn btn-primary">
            Buka Download
          </NuxtLink>
        </div>

        <!-- Error state -->
        <div v-else class="access-state">
          <div class="access-icon access-icon-error">
            <AppIcon name="close" :size="32" />
          </div>
          <h2>Tautan Tidak Valid</h2>
          <p>{{ errorMessage }}</p>
          <NuxtLink to="/order/lookup" class="btn btn-primary">
            Minta Tautan Baru
          </NuxtLink>
        </div>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

useHead({
  title: 'Akses Pesanan - NgopiCode',
})

const route = useRoute()
const { loginWithOrderLink, error: authError } = useAuth()

const loading = ref(true)
const succeeded = ref(false)
const orderCode = ref<string | null>(null)
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    loading.value = false
    errorMessage.value =
      'Token tidak ditemukan. Pastikan Anda membuka link yang benar dari email, atau minta tautan baru.'
    return
  }

  const result = await loginWithOrderLink(token)
  succeeded.value = result.success
  orderCode.value = result.orderCode ?? null

  if (result.success) {
    // Give the cookie a beat to settle before navigating.
    setTimeout(() => {
      if (orderCode.value) {
        navigateTo(`/downloads/${orderCode.value}?claim=1`)
      }
    }, 1500)
  } else {
    errorMessage.value = authError.value || 'Tautan tidak valid atau sudah kedaluwarsa.'
  }

  loading.value = false
})
</script>

<style scoped>
.access-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.access-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
}

.access-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 3rem 2rem;
  box-shadow: 0 8px 32px var(--shadow-card);
}

.access-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.access-state h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
}

.access-state p {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: 0 0 1rem;
  line-height: 1.5;
  max-width: 320px;
}

.access-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 0.5rem;
}

.access-icon-success {
  background: #ecfdf5;
  color: #065f46;
}

[data-theme='dark'] .access-icon-success {
  background: rgba(6, 95, 70, 0.2);
  color: #6ee7b7;
}

.access-icon-error {
  background: #fef2f2;
  color: #b91c1c;
}

[data-theme='dark'] .access-icon-error {
  background: rgba(185, 28, 28, 0.15);
  color: #fca5a5;
}

.access-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-strong);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: background 0.18s;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

@media (prefers-reduced-motion: reduce) {
  .access-spinner {
    animation: none;
  }
}
</style>
