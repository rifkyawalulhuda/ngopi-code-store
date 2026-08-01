<template>
  <div class="admin-page">
    <!-- Admin Panel -->
    <div class="admin-panel">
      <header class="admin-header">
        <h1>Upload Produk Digital</h1>
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
            <span v-if="uploading" class="spinner"></span>
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
          <!-- Table Header -->
          <div class="table-header">
            <h2>Produk Digital Terdaftar
              <span class="badge-count">{{ filteredProducts.length }}</span>
            </h2>
            <div class="table-toolbar">
              <!-- Search -->
              <div class="search-wrapper">
                <span class="search-icon">🔍</span>
                <input
                  v-model="tableSearch"
                  type="text"
                  class="input search-input"
                  placeholder="Cari nama, ID, atau kategori..."
                  @input="handleTableSearch"
                />
                <button v-if="tableSearch" class="btn-clear search-clear" @click="tableSearch = ''; currentPage = 1">✕</button>
              </div>
              <!-- Page Size -->
              <div class="page-size-wrapper">
                <label class="page-size-label">Tampilkan</label>
                <select v-model="pageSize" class="input page-size-select" @change="currentPage = 1">
                  <option :value="15">15</option>
                  <option :value="30">30</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                </select>
                <span class="page-size-label">baris</span>
              </div>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loadingProducts" class="loading-state">
            <span class="spinner"></span> Memuat data...
          </div>

          <!-- Empty -->
          <div v-else-if="digitalProducts.length === 0" class="empty-state">
            Belum ada produk digital yang diupload.
          </div>

          <!-- No search results -->
          <div v-else-if="filteredProducts.length === 0" class="empty-state">
            Tidak ada produk yang cocok dengan "<strong>{{ tableSearch }}</strong>".
          </div>

          <!-- Data Table -->
          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-no">No</th>
                  <th class="col-icon"></th>
                  <th class="col-name">Nama Produk</th>
                  <th class="col-id">Variant ID</th>
                  <th class="col-file">File</th>
                  <th class="col-size">Ukuran</th>
                  <th class="col-type">Tipe</th>
                  <th class="col-action">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(dp, idx) in paginatedProducts"
                  :key="dp.id"
                  class="table-row"
                  :class="{ 'row-deleting': deletingId === dp.productVariantId }"
                >
                  <td class="col-no text-muted">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                  <td class="col-icon"><span class="file-type-icon">{{ getFileIcon(dp.originalFileName) }}</span></td>
                  <td class="col-name">
                    <span class="product-name-text">{{ dp.variantName || `Variant #${dp.productVariantId}` }}</span>
                  </td>
                  <td class="col-id">
                    <code class="id-badge">{{ dp.productVariantId }}</code>
                  </td>
                  <td class="col-file">
                    <span class="file-name-text" :title="dp.originalFileName">{{ dp.originalFileName }}</span>
                  </td>
                  <td class="col-size text-muted">{{ formatFileSize(dp.fileSize) }}</td>
                  <td class="col-type">
                    <span class="mime-badge">{{ getMimeShort(dp.mimeType) }}</span>
                  </td>
                  <td class="col-action">
                    <button
                      class="btn-danger-sm"
                      :disabled="deletingId === dp.productVariantId"
                      @click="handleDelete(dp.productVariantId)"
                    >
                      <span v-if="deletingId === dp.productVariantId" class="spinner"></span>
                      {{ deletingId === dp.productVariantId ? '' : 'Hapus' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="filteredProducts.length > 0" class="pagination-bar">
            <span class="pagination-info">
              Menampilkan {{ paginationStart }}–{{ paginationEnd }} dari {{ filteredProducts.length }} produk
            </span>
            <div class="pagination-controls">
              <button class="btn-page" :disabled="currentPage === 1" @click="currentPage = 1">«</button>
              <button class="btn-page" :disabled="currentPage === 1" @click="currentPage--">‹</button>
              <button
                v-for="page in visiblePages"
                :key="page"
                class="btn-page"
                :class="{ active: page === currentPage, ellipsis: page === '...' }"
                :disabled="page === '...'"
                @click="page !== '...' && (currentPage = page)"
              >{{ page }}</button>
              <button class="btn-page" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
              <button class="btn-page" :disabled="currentPage === totalPages" @click="currentPage = totalPages">»</button>
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

const ADMIN_API = import.meta.client
  ? `http://${window.location.hostname}:3000/admin-api`
  : 'http://localhost:3000/admin-api'

// Auth token (auto-login on mount)
const authToken = ref('')

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

// Table search & pagination
const tableSearch = ref('')
const pageSize = ref(15)
const currentPage = ref(1)

// Search debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null
let tableSearchTimeout: ReturnType<typeof setTimeout> | null = null

// --- Computed: filter + paginate ---

const filteredProducts = computed(() => {
  const q = tableSearch.value.trim().toLowerCase()
  if (!q) return digitalProducts.value
  return digitalProducts.value.filter((dp) => {
    const name = (dp.variantName || '').toLowerCase()
    const id = String(dp.productVariantId).toLowerCase()
    const file = dp.originalFileName.toLowerCase()
    const mime = dp.mimeType.toLowerCase()
    return name.includes(q) || id.includes(q) || file.includes(q) || mime.includes(q)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize.value)))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProducts.value.slice(start, start + pageSize.value)
})

const paginationStart = computed(() => {
  if (filteredProducts.value.length === 0) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})

const paginationEnd = computed(() =>
  Math.min(currentPage.value * pageSize.value, filteredProducts.value.length),
)

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: (number | string)[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

function handleTableSearch() {
  if (tableSearchTimeout) clearTimeout(tableSearchTimeout)
  tableSearchTimeout = setTimeout(() => { currentPage.value = 1 }, 200)
}

function getMimeShort(mime: string): string {
  if (mime.includes('zip')) return 'ZIP'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('epub')) return 'EPUB'
  return mime.split('/').pop()?.toUpperCase() || mime
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

// --- Auto-login on mount ---

async function autoLogin() {
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
        variables: { username: 'superadmin', password: 'superadmin' },
      }),
    })
    const tokenHeader = res.headers.get('vendure-auth-token')
    if (tokenHeader) authToken.value = tokenHeader
  } catch (e) {
    console.error('Auto-login failed:', e)
  }
}

// --- Lifecycle ---
onMounted(async () => {
  await autoLogin()
  await loadDigitalProducts()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 2rem;
}

/* Admin Panel */
.admin-panel {
  max-width: 1100px;
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

/* Table Header */
.table-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.table-header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-soft);
  color: var(--primary-text);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  min-width: 1.5rem;
}

/* Toolbar */
.table-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 1;
}

.search-input {
  padding-left: 2.1rem !important;
  padding-right: 2rem !important;
  width: 220px;
  font-size: 0.85rem;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.15rem 0.25rem;
  border-radius: 4px;
  line-height: 1;
}

.search-clear:hover {
  color: var(--text);
  background: var(--surface-2);
}

.page-size-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.page-size-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.page-size-select {
  width: auto !important;
  padding: 0.4rem 0.6rem !important;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Data Table */
.table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table thead tr {
  background: var(--surface-2);
  border-bottom: 1px solid var(--border-strong);
}

.data-table th {
  padding: 0.7rem 0.85rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.data-table td {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.table-row:last-child td {
  border-bottom: none;
}

.table-row:hover td {
  background: var(--surface-2);
}

.table-row.row-deleting td {
  opacity: 0.5;
}

/* Column widths */
.col-no   { width: 3rem; }
.col-icon { width: 2.5rem; }
.col-name { min-width: 140px; }
.col-id   { width: 90px; }
.col-file { min-width: 150px; max-width: 200px; }
.col-size { width: 80px; white-space: nowrap; }
.col-type { width: 70px; }
.col-action { width: 80px; text-align: center; }

.text-muted { color: var(--text-muted); }

.file-type-icon {
  font-size: 1.2rem;
}

.product-name-text {
  font-weight: 500;
  color: var(--text);
}

.id-badge {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.15rem 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  white-space: nowrap;
}

.file-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.mime-badge {
  background: var(--primary-soft);
  color: var(--primary-text);
  border-radius: 5px;
  padding: 0.15rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-page {
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.4rem;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-page:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--primary);
  color: var(--primary-text);
}

.btn-page.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-contrast);
  font-weight: 600;
}

.btn-page:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-page.ellipsis {
  border-color: transparent;
  background: transparent;
  cursor: default;
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
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .table-toolbar {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .col-id,
  .col-type {
    display: none;
  }
}

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

  .data-table th,
  .data-table td {
    padding: 0.6rem 0.5rem;
    font-size: 0.78rem;
  }
}
</style>
