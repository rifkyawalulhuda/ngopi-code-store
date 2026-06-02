<template>
  <div class="callback-page">
    <TheHeader />
    <main class="callback-main">
      <div class="callback-container">
        <div v-if="loading" class="callback-loading">
          <div class="spinner" />
          <p>Mengautentikasi dengan GitHub...</p>
        </div>
        <div v-else-if="errorMsg" class="callback-error">
          <p class="error-text">{{ errorMsg }}</p>
          <NuxtLink to="/auth" class="btn btn-primary">Kembali ke Login</NuxtLink>
        </div>
      </div>
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

useHead({
  title: 'GitHub Login - NgopiCode',
})

const { loginWithGitHub } = useAuth()
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  const route = useRoute()
  const code = route.query.code as string
  const state = route.query.state as string

  if (!code || !state) {
    errorMsg.value = 'Parameter tidak valid dari GitHub.'
    loading.value = false
    return
  }

  // Verify CSRF state
  const storedState = sessionStorage.getItem('github_oauth_state')
  if (state !== storedState) {
    errorMsg.value = 'State tidak cocok. Silakan coba lagi.'
    loading.value = false
    return
  }
  sessionStorage.removeItem('github_oauth_state')

  // Authenticate with Vendure
  const success = await loginWithGitHub(code, state)
  if (success) {
    navigateTo('/account')
  } else {
    errorMsg.value = 'Autentikasi GitHub gagal. Silakan coba lagi.'
    loading.value = false
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.callback-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
}

.callback-container {
  text-align: center;
  max-width: 400px;
}

.callback-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.callback-loading p {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.callback-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.error-text {
  color: #dc2626;
  font-size: 0.95rem;
}

[data-theme='dark'] .error-text {
  color: #fca5a5;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
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
</style>
