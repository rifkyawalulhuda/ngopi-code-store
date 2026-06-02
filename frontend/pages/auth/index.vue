<template>
  <div class="auth-page">
    <TheHeader />

    <main class="auth-main">
      <div class="auth-container">
        <!-- Tab switcher -->
        <div class="auth-tabs" role="tablist" aria-label="Login atau Register">
          <button
            type="button"
            role="tab"
            class="auth-tab"
            :class="{ active: activeTab === 'login' }"
            :aria-selected="activeTab === 'login'"
            @click="activeTab = 'login'"
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            class="auth-tab"
            :class="{ active: activeTab === 'register' }"
            :aria-selected="activeTab === 'register'"
            @click="activeTab = 'register'"
          >
            Daftar
          </button>
        </div>

        <!-- Login Form -->
        <transition name="fade" mode="out-in">
          <form
            v-if="activeTab === 'login'"
            key="login"
            class="auth-form"
            role="tabpanel"
            aria-label="Form masuk"
            @submit.prevent="onLogin"
          >
            <div class="auth-header">
              <div class="auth-icon">
                <AppIcon name="user" :size="28" />
              </div>
              <h1 class="auth-title">Welcome Back</h1>
              <p class="auth-subtitle">Akses koleksi produk digital premium kamu</p>
            </div>

            <!-- Error/Success messages -->
            <div v-if="authError && activeTab === 'login'" class="auth-message auth-error" role="alert">
              {{ authError }}
            </div>

            <div class="form-group">
              <label for="login-email" class="form-label">Email Address</label>
              <div class="input-wrapper">
                <AppIcon name="mail" :size="18" class="input-icon" />
                <input
                  id="login-email"
                  v-model="loginForm.email"
                  type="email"
                  class="form-input"
                  placeholder="nama@email.com"
                  autocomplete="email"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <div class="label-row">
                <label for="login-password" class="form-label">Password</label>
                <a href="#" class="forgot-link">Lupa Password?</a>
              </div>
              <div class="input-wrapper">
                <AppIcon name="lock" :size="18" class="input-icon" />
                <input
                  id="login-password"
                  v-model="loginForm.password"
                  :type="showLoginPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="Masukkan password"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  :aria-label="showLoginPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showLoginPassword = !showLoginPassword"
                >
                  <AppIcon :name="showLoginPassword ? 'close' : 'search'" :size="16" />
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-full" :disabled="loginLoading">
              <span v-if="loginLoading" class="btn-spinner" />
              <span v-else>Sign In</span>
            </button>

            <!-- Social login -->
            <div class="divider">
              <span>Atau lanjutkan dengan</span>
            </div>

            <div class="social-buttons">
              <button type="button" class="btn-social" @click="onSocialLogin('google')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" class="btn-social" @click="onSocialLogin('github')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                GitHub
              </button>
            </div>

            <p class="auth-switch">
              Belum punya akun?
              <button type="button" class="link-btn" @click="activeTab = 'register'">Buat akun</button>
            </p>
          </form>

          <!-- Register Form -->
          <form
            v-else
            key="register"
            class="auth-form"
            role="tabpanel"
            aria-label="Form pendaftaran"
            @submit.prevent="onRegister"
          >
            <div class="auth-header">
              <div class="auth-icon">
                <AppIcon name="user" :size="28" />
              </div>
              <h1 class="auth-title">Create Account</h1>
              <p class="auth-subtitle">Bergabung dengan komunitas digital eksklusif kami</p>
            </div>

            <!-- Success message (after registration) -->
            <div v-if="successMessage" class="auth-message auth-success" role="status">
              {{ successMessage }}
            </div>
            <!-- Error message -->
            <div v-if="authError && activeTab === 'register'" class="auth-message auth-error" role="alert">
              {{ authError }}
            </div>

            <div class="form-group">
              <label for="reg-name" class="form-label">Nama Lengkap</label>
              <div class="input-wrapper">
                <AppIcon name="user" :size="18" class="input-icon" />
                <input
                  id="reg-name"
                  v-model="registerForm.name"
                  type="text"
                  class="form-input"
                  placeholder="Nama lengkap kamu"
                  autocomplete="name"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="reg-email" class="form-label">Email Address</label>
              <div class="input-wrapper">
                <AppIcon name="mail" :size="18" class="input-icon" />
                <input
                  id="reg-email"
                  v-model="registerForm.email"
                  type="email"
                  class="form-input"
                  placeholder="nama@email.com"
                  autocomplete="email"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="reg-password" class="form-label">Password</label>
              <div class="input-wrapper">
                <AppIcon name="lock" :size="18" class="input-icon" />
                <input
                  id="reg-password"
                  v-model="registerForm.password"
                  :type="showRegPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="Minimal 8 karakter"
                  autocomplete="new-password"
                  minlength="8"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  :aria-label="showRegPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showRegPassword = !showRegPassword"
                >
                  <AppIcon :name="showRegPassword ? 'close' : 'search'" :size="16" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="reg-password-confirm" class="form-label">Konfirmasi Password</label>
              <div class="input-wrapper">
                <AppIcon name="lock" :size="18" class="input-icon" />
                <input
                  id="reg-password-confirm"
                  v-model="registerForm.passwordConfirm"
                  :type="showRegPasswordConfirm ? 'text' : 'password'"
                  class="form-input"
                  :class="{ 'input-error': passwordMismatch }"
                  placeholder="Ulangi password kamu"
                  autocomplete="new-password"
                  minlength="8"
                  required
                  :aria-invalid="passwordMismatch"
                  aria-describedby="reg-password-confirm-error"
                />
                <button
                  type="button"
                  class="toggle-password"
                  :aria-label="showRegPasswordConfirm ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showRegPasswordConfirm = !showRegPasswordConfirm"
                >
                  <AppIcon :name="showRegPasswordConfirm ? 'close' : 'search'" :size="16" />
                </button>
              </div>
              <p
                v-if="passwordMismatch"
                id="reg-password-confirm-error"
                class="field-error"
                role="alert"
              >
                Password tidak cocok. Pastikan kedua password sama.
              </p>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  v-model="registerForm.agreeTerms"
                  type="checkbox"
                  class="checkbox-input"
                  required
                />
                <span class="checkbox-text">
                  Saya setuju dengan
                  <a href="#" class="link-inline">Syarat Layanan</a> dan
                  <a href="#" class="link-inline">Kebijakan Privasi</a>.
                </span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-full" :disabled="registerLoading || passwordMismatch">
              <span v-if="registerLoading" class="btn-spinner" />
              <span v-else>Create Account</span>
            </button>

            <p class="auth-switch">
              Sudah punya akun?
              <button type="button" class="link-btn" @click="activeTab = 'login'">Sign In</button>
            </p>
          </form>
        </transition>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

useHead({
  title: 'Login / Register - NgopiCode',
})

const { login, register, loginWithGoogle, loginWithGitHub, ensureSession, isLoggedIn, error: authError, loading: authLoading } = useAuth()

// If already logged in, skip the auth page and go to the account dashboard
onMounted(async () => {
  await ensureSession()
  if (isLoggedIn.value) {
    navigateTo('/account')
  }
})

const activeTab = ref<'login' | 'register'>('login')
const showLoginPassword = ref(false)
const showRegPassword = ref(false)
const showRegPasswordConfirm = ref(false)
const loginLoading = ref(false)
const registerLoading = ref(false)
const successMessage = ref('')

const loginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  agreeTerms: false,
})

// Only flag a mismatch once the user has started typing the confirmation
const passwordMismatch = computed(
  () =>
    registerForm.passwordConfirm.length > 0 &&
    registerForm.password !== registerForm.passwordConfirm,
)

async function onLogin() {
  loginLoading.value = true
  successMessage.value = ''
  authError.value = null
  try {
    const success = await login(loginForm.email, loginForm.password)
    if (success) {
      // Redirect to account dashboard
      navigateTo('/account')
    }
  } finally {
    loginLoading.value = false
  }
}

async function onRegister() {
  // Guard: passwords must match
  if (registerForm.password !== registerForm.passwordConfirm) {
    authError.value = 'Password tidak cocok. Pastikan kedua password sama.'
    return
  }

  registerLoading.value = true
  successMessage.value = ''
  authError.value = null
  try {
    // Split name into first/last
    const nameParts = registerForm.name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const success = await register({
      firstName,
      lastName,
      emailAddress: registerForm.email,
      password: registerForm.password,
    })
    if (success) {
      // Store password temporarily for verification step
      if (import.meta.client) {
        sessionStorage.setItem('_reg_pw', registerForm.password)
      }
      successMessage.value = 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.'
      // Reset form
      registerForm.name = ''
      registerForm.email = ''
      registerForm.password = ''
      registerForm.passwordConfirm = ''
      registerForm.agreeTerms = false
    }
  } finally {
    registerLoading.value = false
  }
}

function onSocialLogin(provider: string) {
  if (provider === 'google') {
    initiateGoogleLogin()
  } else if (provider === 'github') {
    initiateGitHubLogin()
  }
}

const socialLoading = ref(false)

function initiateGoogleLogin() {
  const config = useRuntimeConfig()
  const clientId = config.public.googleClientId as string

  if (!clientId) {
    authError.value = 'Google Client ID belum dikonfigurasi.'
    return
  }

  if (!(window as any).google) {
    authError.value = 'Google SDK belum dimuat. Silakan refresh halaman.'
    return
  }

  // Initialize and prompt Google One Tap / Sign-In
  ;(window as any).google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredentialResponse,
  })
  ;(window as any).google.accounts.id.prompt((notification: any) => {
    // If One Tap is dismissed/skipped, fallback to popup
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      ;(window as any).google.accounts.id.prompt()
    }
  })
}

async function handleGoogleCredentialResponse(response: any) {
  if (!response.credential) {
    authError.value = 'Gagal mendapatkan credential dari Google.'
    return
  }

  socialLoading.value = true
  loginLoading.value = true
  try {
    const success = await loginWithGoogle(response.credential)
    if (success) {
      navigateTo('/account')
    }
  } finally {
    socialLoading.value = false
    loginLoading.value = false
  }
}

function initiateGitHubLogin() {
  const config = useRuntimeConfig()
  const clientId = config.public.githubClientId as string

  if (!clientId) {
    authError.value = 'GitHub Client ID belum dikonfigurasi.'
    return
  }

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36)
  sessionStorage.setItem('github_oauth_state', state)

  // Redirect to GitHub authorization
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/github/callback`)
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user%20user:email&state=${state}`
  window.location.href = url
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
}

.auth-container {
  width: 100%;
  max-width: 440px;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 2rem;
}

.auth-tab {
  flex: 1;
  padding: 0.7rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.auth-tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 2px 8px var(--shadow-card);
}

.auth-tab:hover:not(.active) {
  color: var(--text);
}

/* Form card */
.auth-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.25rem 2rem;
  box-shadow: 0 8px 32px var(--shadow-card);
}

/* Header */
.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--primary-text);
  margin-bottom: 1rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 0.4rem;
  letter-spacing: -0.02em;
}

.auth-subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
  margin: 0;
  line-height: 1.5;
}

/* Form groups */
.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.forgot-link {
  font-size: 0.82rem;
  color: var(--primary-text);
  text-decoration: none;
  font-weight: 500;
}

.forgot-link:hover {
  text-decoration: underline;
}

/* Input */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.9rem;
  color: var(--text-muted);
  pointer-events: none;
  flex-shrink: 0;
}

.form-input {
  width: 100%;
  padding: 0.8rem 0.9rem 0.8rem 2.75rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.18s, box-shadow 0.18s;
  outline: none;
}

.form-input::placeholder {
  color: var(--placeholder-icon);
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.form-input.input-error {
  border-color: #dc2626;
}

.form-input.input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.field-error {
  margin: 0.45rem 0 0;
  font-size: 0.82rem;
  color: #dc2626;
  line-height: 1.4;
}

[data-theme='dark'] .field-error {
  color: #fca5a5;
}

.toggle-password {
  position: absolute;
  right: 0.6rem;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.18s;
}

.toggle-password:hover {
  color: var(--primary-text);
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--primary);
  flex-shrink: 0;
}

.checkbox-text {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.link-inline {
  color: var(--primary-text);
  text-decoration: none;
  font-weight: 500;
}

.link-inline:hover {
  text-decoration: underline;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: transform 0.15s, background 0.18s, box-shadow 0.18s, opacity 0.18s;
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
  box-shadow: 0 6px 18px rgba(31, 122, 77, 0.25);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-full {
  width: 100%;
  margin-top: 0.5rem;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.divider span {
  font-size: 0.82rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Social buttons */
.social-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.btn-social {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
}

.btn-social:hover {
  background: var(--surface-2);
  border-color: var(--primary);
}

/* Switch link */
.auth-switch {
  text-align: center;
  margin: 1.5rem 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Auth messages */
.auth-message {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.88rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.auth-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

[data-theme='dark'] .auth-error {
  background: rgba(185, 28, 28, 0.12);
  color: #fca5a5;
  border-color: rgba(185, 28, 28, 0.3);
}

.auth-success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

[data-theme='dark'] .auth-success {
  background: rgba(6, 95, 70, 0.12);
  color: #6ee7b7;
  border-color: rgba(6, 95, 70, 0.3);
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary-text);
  font-weight: 600;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive */
@media (max-width: 520px) {
  .auth-main {
    padding: 2rem 1rem;
    align-items: flex-start;
  }

  .auth-form {
    padding: 1.75rem 1.25rem;
  }

  .social-buttons {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
  .btn-spinner {
    animation: none;
  }
}
</style>
