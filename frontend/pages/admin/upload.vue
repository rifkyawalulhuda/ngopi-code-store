<template>
  <div class="admin-page">
    <!-- Login Gate -->
    <div v-if="!isAuthenticated" class="login-gate">
      <div class="login-card">
        <h1>🔐 Admin Login</h1>
        <p class="login-desc">Masuk untuk mengakses panel upload produk digital.</p>
        <div v-if="loginError" class="alert alert-error">{{ loginError }}</div>
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="admin-user">Username</label>
            <input id="admin-user" v-model="adminUsername" type="text" class="input" placeholder="Username admin" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label for="admin-pass">Password</label>
            <input id="admin-pass" v-model="adminPassword" type="password" class="input" placeholder="Password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn-primary" :disabled="loggingIn || !adminUsername || !adminPassword">
            <span v-if="loggingIn" class="spinner" />
            {{ loggingIn ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Admin Panel -->
    <div v-else class="admin-panel">
      <header class="admin-header">
        <h1>Upload Produk Digital</h1>
        <button class="btn-ghost" @click="handleLogout">Logout</button>
      </header>

      <!-- Upload Form -->
      <section class="upload-section">
        <div class="card">
          <h2>Upload File Baru</h2>

          <!-- Variant Search -->
          <div class="form-group">
            <label for="variant-search">Cari Variant Produk</label>
            <input
              id="variant-search"
              v-model="variantSearch"
              type="text"
              placeholder="Ketik nama produk atau SKU..."
              class="input"
              @input="handleVariantSearch"
            />
            <ul v-if="variantResults.length > 0" class="variant-dropdown">
              <li
                v-for="v in variantResults"
                :key="v.id"
                class="variant-option"
                :class="{ selected: selectedVariant?.id === v.id }"
                @click="selectVariant(v)"
              >
                <span class="variant-name">{{ v.name }}</span>
                <span class="variant-sku">{{ v.sku }}</span>
              </li>
            </ul>
            <div v-if="selectedVariant" class="selected-badge">
              ✓ {{ selectedVariant.name }} ({{ selectedVariant.sku }})
              <button class="btn-clear" @click="clearVariant">✕</button>
            </div>
          </div>

          <!-- File Upload Area -->
          <div class="form-group">
            <label>File Produk Digital</label>
            <div
              class="drop-zone"
              :class="{ dragover: isDragOver, 'has-file': selectedFile }"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".zip,.pdf,.epub"
                class="file-input-hidden"
                @change="handleFileSelect"
              />
              <div v-if="!selectedFile" class="drop-zone-content">
                <span class="drop-icon">📁</span>
                <p>Drag & drop file di sini atau <strong>klik untuk browse</strong></p>
                <p class="drop-hint">Format: .zip, .pdf, .epub — Maks 500MB</p>
              </div>
              <div v-else class="file-preview">
                <span class="file-icon">{{ getFileIcon(selectedFile.name) }}</span>
                <div class="file-info">
                  <p class="file-name">{{ selectedFile.name }}</p>
                  <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button class="btn-clear" @click.stop="clearFile">✕</button>
              </div>
            </div>
          </div>

          <!-- Upload Button -->
          <button
            class="btn-primary btn-upload"
            :disabled="!canUpload || uploading"
            @click="handleUpload"
          >
            <span v-if="uploading" class="spinner" />
            {{ uploading ? `Mengupload... ${uploadProgress}%` : 'Upload File' }}
          </button>

          <!-- Feedback -->
          <div v-if="uploadSuccess" class="alert alert-success">
            ✅ File berhasil diupload!
            <div class="upload-result">
              <span>{{ uploadResult?.originalFileName }}</span>
              <span>{{ formatFileSize(uploadResult?.fileSize || 0) }}</span>
            </div>
          </div>
          <div v-if="uploadError" class="alert alert-error">
            ❌ {{ uploadError }}
          </div>
        </div>
      </section>

      <!-- Existing Digital Products -->
      <section class="products-section">
        <div class="card">
          <h2>Produk Digital Terdaftar</h2>
          <div v-if="loadingProducts" class="loading-state">
            <span class="spinner" /> Memuat data...
          </div>
          <div v-else-if="digitalProducts.length === 0" class="empty-state">
            Belum ada produk digital yang diupload.
          </div>
          <div v-else class="products-list">
            <div v-for="dp in digitalProducts" :key="dp.id" class="product-row">
              <div class="product-info">
                <span class="product-icon">{{ getFileIcon(dp.originalFileName) }}</span>
                <div>
                  <p class="product-name">{{ dp.variantName || `Variant #${dp.productVariantId}` }}</p>
                  <p class="product-file">{{ dp.originalFileName }} — {{ formatFileSize(dp.fileSize) }}</p>
                </div>
              </div>
              <button
                class="btn-danger-sm"
                :disabled="deletingId === dp.productVariantId"
                @click="handleDelete(dp.productVariantId)"
              >
                {{ deletingId === dp.productVariantId ? '...' : 'Hapus' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

interface Variant {
  id: string
  name: string
  sku: string
}

interface DigitalProductInfo {
  id: string
  productVariantId: string
  fileName: string
  originalFileName: string
  fileSize: number
  mimeType: string
  variantName?: string
}

interface UploadResult {
  originalFileName: string
  fileSize: number
}

const ADMIN_API = 'http://localhost:3000/admin-api'

// Auth state
const isAuthenticated = ref(false)
const authToken = ref('')
const loggingIn = ref(false)
const loginError = ref('')
const adminUsername = ref('')
const adminPassword = ref('')

// Upload form state
const variantSearch = ref('')
const variantResults = ref<Variant[]>([])
const selectedVariant = ref<Variant | null>(null)
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadSuccess = ref(false)
const uploadError = ref('')
const uploadResult = ref<UploadResult | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Products list state
const digitalProducts = ref<DigitalProductInfo[]>([])
const loadingProducts = ref(false)
const deletingId = ref<string | null>(null)

// Search debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// --- Auth ---

async function handleLogin() {
  loggingIn.value = true
  loginError.value = ''
  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            ... on CurrentUser { id }
            ... on InvalidCredentialsError { message }
            ... on NativeAuthStrategyError { message }
          }
        }`,
        variables: { username: adminUsername.value, password: adminPassword.value },
      }),
    })
    const json = await res.json()
    const result = json.data?.login

    if (result?.id) {
      isAuthenticated.value = true
      // Extract token from cookie or use session
      const tokenHeader = res.headers.get('vendure-auth-token')
      if (tokenHeader) authToken.value = tokenHeader
      await loadVariants()
      await loadDigitalProducts()
    } else {
      loginError.value = result?.message || 'Login gagal. Periksa kredensial.'
    }
  } catch (e: any) {
    loginError.value = `Error: ${e.message}`
  } finally {
    loggingIn.value = false
  }
}

function handleLogout() {
  isAuthenticated.value = false
  authToken.value = ''
  digitalProducts.value = []
}

// --- GraphQL helper ---

async function adminQuery(query: string, variables: Record<string, any> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken.value) headers['vendure-auth-token'] = authToken.value

  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  })

  // Capture auth token from response
  const token = res.headers.get('vendure-auth-token')
  if (token) authToken.value = token

  return res.json()
}

// --- Variant Search ---

async function loadVariants(search = '') {
  const query = `query GetVariants($options: ProductVariantListOptions) {
    productVariants(options: $options) {
      items { id name sku }
      totalItems
    }
  }`
  const options: any = { take: 20 }
  if (search) {
    options.filter = { name: { contains: search } }
  }

  const json = await adminQuery(query, { options })
  return json.data?.productVariants?.items || []
}

function handleVariantSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (variantSearch.value.length < 2) {
      variantResults.value = []
      return
    }
    variantResults.value = await loadVariants(variantSearch.value)
  }, 300)
}

function selectVariant(v: Variant) {
  selectedVariant.value = v
  variantSearch.value = ''
  variantResults.value = []
}

function clearVariant() {
  selectedVariant.value = null
}

// --- File handling ---

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    validateAndSetFile(input.files[0])
  }
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false
  if (e.dataTransfer?.files?.[0]) {
    validateAndSetFile(e.dataTransfer.files[0])
  }
}

function validateAndSetFile(file: File) {
  const maxSize = 500 * 1024 * 1024 // 500MB
  const allowedExts = ['.zip', '.pdf', '.epub']
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!allowedExts.includes(ext)) {
    uploadError.value = `Format file tidak didukung. Gunakan: ${allowedExts.join(', ')}`
    return
  }
  if (file.size > maxSize) {
    uploadError.value = 'Ukuran file melebihi 500MB.'
    return
  }

  selectedFile.value = file
  uploadError.value = ''
  uploadSuccess.value = false
}

function clearFile() {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// --- Upload ---

const canUpload = computed(() => selectedVariant.value && selectedFile.value)

async function handleUpload() {
  if (!selectedVariant.value || !selectedFile.value) return

  uploading.value = true
  uploadProgress.value = 0
  uploadError.value = ''
  uploadSuccess.value = false

  try {
    // GraphQL multipart upload spec (apollo-upload-client compatible)
    const operations = JSON.stringify({
      query: `mutation UploadDigitalProduct($variantId: ID!, $file: Upload!) {
        uploadDigitalProduct(variantId: $variantId, file: $file) {
          id
          originalFileName
          fileSize
          mimeType
        }
      }`,
      variables: { variantId: selectedVariant.value.id, file: null },
    })

    const map = JSON.stringify({ '0': ['variables.file'] })

    const formData = new FormData()
    formData.append('operations', operations)
    formData.append('map', map)
    formData.append('0', selectedFile.value)

    const headers: Record<string, string> = {}
    if (authToken.value) headers['vendure-auth-token'] = authToken.value

    // Use XMLHttpRequest for progress tracking
    const result = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', ADMIN_API)

      // Set auth headers
      if (authToken.value) {
        xhr.setRequestHeader('vendure-auth-token', authToken.value)
      }
      xhr.withCredentials = true

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          uploadProgress.value = Math.round((e.loaded / e.total) * 100)
        }
      }

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText)
          // Capture token
          const token = xhr.getResponseHeader('vendure-auth-token')
          if (token) authToken.value = token
          resolve(json)
        } catch {
          reject(new Error('Invalid response'))
        }
      }

      xhr.onerror = () => reject(new Error('Upload gagal — network error'))
      xhr.send(formData)
    })

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Upload gagal')
    }

    const data = result.data?.uploadDigitalProduct
    uploadSuccess.value = true
    uploadResult.value = {
      originalFileName: data.originalFileName,
      fileSize: data.fileSize,
    }

    // Reset form
    clearFile()
    clearVariant()

    // Refresh list
    await loadDigitalProducts()
  } catch (e: any) {
    uploadError.value = e.message || 'Upload gagal.'
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// --- Digital Products List ---

async function loadDigitalProducts() {
  loadingProducts.value = true
  try {
    // Get all variants that have digital products
    const allVariants = await loadVariants()
    const products: DigitalProductInfo[] = []

    for (const variant of allVariants) {
      const json = await adminQuery(
        `query GetDigitalProduct($variantId: ID!) {
          digitalProductByVariantId(variantId: $variantId) {
            id
            productVariantId
            fileName
            originalFileName
            fileSize
            mimeType
          }
        }`,
        { variantId: variant.id },
      )
      const dp = json.data?.digitalProductByVariantId
      if (dp) {
        products.push({ ...dp, variantName: variant.name })
      }
    }

    digitalProducts.value = products
  } catch (e: any) {
    console.error('Failed to load digital products:', e)
  } finally {
    loadingProducts.value = false
  }
}

// --- Delete ---

async function handleDelete(variantId: string) {
  if (!confirm('Hapus file digital ini? Aksi ini tidak bisa dibatalkan.')) return

  deletingId.value = variantId
  try {
    const json = await adminQuery(
      `mutation DeleteDigitalProduct($variantId: ID!) {
        deleteDigitalProduct(variantId: $variantId)
      }`,
      { variantId },
    )

    if (json.data?.deleteDigitalProduct) {
      digitalProducts.value = digitalProducts.value.filter(
        (dp) => dp.productVariantId !== variantId,
      )
    }
  } catch (e: any) {
    alert(`Gagal menghapus: ${e.message}`)
  } finally {
    deletingId.value = null
  }
}

// --- Utilities ---

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'zip': return '📦'
    case 'pdf': return '📄'
    case 'epub': return '📚'
    default: return '📁'
  }
}

// --- Lifecycle ---
// No auto-login — user must enter credentials manually
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 2rem;
}

/* Login Gate */
.login-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.login-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 24px var(--shadow-card);
}

.login-card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: var(--text);
}

.login-desc {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-form .form-group {
  margin-bottom: 0;
}

.login-form .btn-primary {
  width: 100%;
  margin-top: 0.5rem;
}

/* Admin Panel */
.admin-panel {
  max-width: 800px;
  margin: 0 auto;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.admin-header h1 {
  font-size: 1.75rem;
  color: var(--text);
  margin: 0;
}

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 2px 12px var(--shadow-card);
}

.card h2 {
  font-size: 1.15rem;
  color: var(--text);
  margin: 0 0 1.5rem;
}

.upload-section {
  margin-bottom: 2rem;
}

/* Form */
.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: var(--primary);
}

/* Variant Dropdown */
.variant-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  list-style: none;
  margin: 4px 0 0;
  padding: 4px;
  box-shadow: 0 8px 24px var(--shadow-card-strong);
}

.variant-option {
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.15s;
}

.variant-option:hover,
.variant-option.selected {
  background: var(--primary-soft);
}

.variant-name {
  font-size: 0.875rem;
  color: var(--text);
}

.variant-sku {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
}

.selected-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: var(--primary-soft);
  color: var(--primary-text);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* Drop Zone */
.drop-zone {
  border: 2px dashed var(--border-strong);
  border-radius: 12px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.drop-zone:hover,
.drop-zone.dragover {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: var(--primary);
  background: var(--primary-soft);
  padding: 1.25rem 1.5rem;
}

.file-input-hidden {
  display: none;
}

.drop-zone-content {
  pointer-events: none;
}

.drop-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.drop-zone-content p {
  margin: 0.25rem 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.drop-zone-content strong {
  color: var(--primary-text);
}

.drop-hint {
  font-size: 0.75rem !important;
  opacity: 0.7;
}

/* File Preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
}

.file-icon {
  font-size: 1.75rem;
}

.file-info {
  flex: 1;
}

.file-name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.file-size {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: var(--primary-contrast);
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-upload {
  width: 100%;
  padding: 1rem;
}

.btn-ghost {
  padding: 0.5rem 1rem;
  background: var(--btn-ghost-bg);
  color: var(--text);
  border: 1px solid var(--btn-ghost-border);
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-ghost:hover {
  background: var(--btn-ghost-hover);
}

.btn-clear {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-muted);
  padding: 0.25rem;
  line-height: 1;
}

.btn-clear:hover {
  color: var(--text);
}

.btn-danger-sm {
  padding: 0.35rem 0.75rem;
  background: transparent;
  color: #d04848;
  border: 1px solid #d04848;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-danger-sm:hover:not(:disabled) {
  background: #d04848;
  color: #ffffff;
}

.btn-danger-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Alerts */
.alert {
  padding: 0.85rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-top: 1rem;
}

.alert-success {
  background: var(--primary-soft);
  color: var(--primary-text);
  border: 1px solid var(--primary);
}

.alert-error {
  background: rgba(208, 72, 72, 0.08);
  color: #d04848;
  border: 1px solid rgba(208, 72, 72, 0.25);
}

.upload-result {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.85;
}

/* Products List */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: var(--surface-2);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-icon {
  font-size: 1.5rem;
}

.product-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}

.product-file {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* States */
.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 640px) {
  .admin-page {
    padding: 1rem;
  }

  .card {
    padding: 1.25rem;
    border-radius: 12px;
  }

  .admin-header h1 {
    font-size: 1.25rem;
  }

  .drop-zone {
    padding: 1.5rem 1rem;
  }
}
</style>
