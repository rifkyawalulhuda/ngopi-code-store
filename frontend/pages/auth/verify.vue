<template>
  <div class="verify-page">
    <TheHeader />

    <main class="verify-main">
      <div class="verify-card">
        <!-- Loading state -->
        <div v-if="loading" class="verify-state">
          <div class="verify-spinner" />
          <h2>Memverifikasi email...</h2>
          <p>Mohon tunggu sebentar.</p>
        </div>

        <!-- Success state -->
        <div v-else-if="verified" class="verify-state">
          <div class="verify-icon verify-icon-success">
            <AppIcon name="check" :size="32" />
          </div>
          <h2>Email Terverifikasi!</h2>
          <p>Akun Anda sudah aktif. Silakan login untuk mulai berbelanja.</p>
          <NuxtLink to="/auth" class="btn btn-primary">
            Login Sekarang
          </NuxtLink>
        </div>

        <!-- Error state -->
        <div v-else class="verify-state">
          <div class="verify-icon verify-icon-error">
            <AppIcon name="close" :size="32" />
          </div>
          <h2>Verifikasi Gagal</h2>
          <p>{{ errorMessage }}</p>
          <NuxtLink to="/auth" class="btn btn-primary">
            Kembali ke Login
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
  title: 'Verifikasi Email - NgopiCode',
})

const route = useRoute()
const { verifyEmail, error: authError } = useAuth()

const loading = ref(true)
const verified = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    loading.value = false
    errorMessage.value = 'Token verifikasi tidak ditemukan. Pastikan Anda menggunakan link yang benar dari email.'
    return
  }

  const success = await verifyEmail(token)
  verified.value = success
  if (!success) {
    errorMessage.value = authError.value || 'Verifikasi gagal. Silakan coba lagi.'
  }
  loading.value = false
})
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.verify-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
}

.verify-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 3rem 2rem;
  box-shadow: 0 8px 32px var(--shadow-card);
}

.verify-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.verify-state h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
}

.verify-state p {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: 0 0 1rem;
  line-height: 1.5;
  max-width: 320px;
}

.verify-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 0.5rem;
}

.verify-icon-success {
  background: #ecfdf5;
  color: #065f46;
}

[data-theme='dark'] .verify-icon-success {
  background: rgba(6, 95, 70, 0.2);
  color: #6ee7b7;
}

.verify-icon-error {
  background: #fef2f2;
  color: #b91c1c;
}

[data-theme='dark'] .verify-icon-error {
  background: rgba(185, 28, 28, 0.15);
  color: #fca5a5;
}

.verify-spinner {
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
  .verify-spinner {
    animation: none;
  }
}
</style>
