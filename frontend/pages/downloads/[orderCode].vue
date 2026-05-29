<template>
  <div class="downloads-page">
    <h1>Download Produk Digital</h1>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state" aria-live="polite">
      <p>Memuat data download...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state" role="alert">
      <p>{{ error }}</p>
      <NuxtLink to="/" class="btn-back">Kembali ke Beranda</NuxtLink>
    </div>

    <!-- Download Items -->
    <div v-else-if="items.length > 0" class="downloads-content">
      <p class="order-info">
        Kode Order: <strong>{{ orderCode }}</strong>
      </p>

      <ul class="download-list" aria-label="Daftar file download">
        <li
          v-for="item in items"
          :key="item.id"
          class="download-item"
          :class="{
            'download-item--active': isItemAvailable(item),
            'download-item--expired': !isItemAvailable(item),
          }"
        >
          <div class="download-item__info">
            <span class="download-item__filename">{{ item.fileName }}</span>
            <span class="download-item__remaining">
              {{ formatRemaining(item.currentDownloads, item.maxDownloads) }}
            </span>
            <span class="download-item__expiry">
              Kedaluwarsa: {{ formatExpiry(item.expiresAt) }}
            </span>
          </div>

          <div class="download-item__actions">
            <!-- Active item: show download button -->
            <template v-if="isItemAvailable(item)">
              <button
                class="btn-download"
                :disabled="getActionState(item.downloadToken).downloading"
                :aria-label="`Download ${item.fileName}`"
                @click="handleDownload(item.downloadToken)"
              >
                <span v-if="getActionState(item.downloadToken).downloading">
                  Memproses...
                </span>
                <span v-else>Download</span>
              </button>
            </template>

            <!-- Unavailable item: show disabled button with reason -->
            <template v-else>
              <button
                class="btn-download btn-download--disabled"
                disabled
                :aria-label="getItemUnavailableReason(item)"
                :title="getItemUnavailableReason(item)"
              >
                Download
              </button>
              <span class="status-badge status-badge--expired">
                {{ getItemUnavailableReason(item) }}
              </span>
            </template>
          </div>

          <!-- Error message for this item -->
          <div
            v-if="getActionState(item.downloadToken).error"
            class="download-item__error"
            role="alert"
          >
            <p>{{ getActionState(item.downloadToken).error }}</p>

            <!-- Fallback: copy link button -->
            <button
              v-if="getActionState(item.downloadToken).fallbackUrl"
              class="btn-copy-link"
              :aria-label="`Salin link download ${item.fileName}`"
              @click="handleCopyLink(item.downloadToken)"
            >
              {{ copySuccess[item.downloadToken] ? 'Link disalin!' : 'Salin Link Download' }}
            </button>

            <button
              class="btn-dismiss"
              aria-label="Tutup pesan error"
              @click="clearActionError(item.downloadToken)"
            >
              Tutup
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Empty State (order found but no downloads) -->
    <div v-else class="empty-state" aria-live="polite">
      <p>Tidak ada file download untuk order ini.</p>
      <NuxtLink to="/" class="btn-back">Kembali ke Beranda</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  useDownload,
  formatDateID,
  formatRemainingDownloads,
  isDownloadAvailable,
  getUnavailableReason,
  type DownloadItem,
} from '~/composables/useDownload'

useHead({
  title: 'Download - NgopiCode Digital Store',
})

const route = useRoute()
const {
  items,
  orderCode,
  loading,
  error,
  fetchDownloads,
  requestDownloadLink,
  copyDownloadLink,
  getActionState,
  clearActionError,
} = useDownload()

const copySuccess = ref<Record<string, boolean>>({})

function isItemAvailable(item: DownloadItem): boolean {
  return isDownloadAvailable(item)
}

function formatRemaining(current: number, max: number): string {
  return formatRemainingDownloads(current, max)
}

function formatExpiry(dateString: string): string {
  return formatDateID(dateString)
}

function getItemUnavailableReason(item: DownloadItem): string {
  return getUnavailableReason(item) || 'Tidak tersedia'
}

async function handleDownload(downloadToken: string): Promise<void> {
  await requestDownloadLink(downloadToken)
}

async function handleCopyLink(downloadToken: string): Promise<void> {
  const success = await copyDownloadLink(downloadToken)
  if (success) {
    copySuccess.value[downloadToken] = true
    setTimeout(() => {
      copySuccess.value[downloadToken] = false
    }, 3000)
  }
}

onMounted(async () => {
  const code = route.params.orderCode as string
  if (code) {
    await fetchDownloads(code)
  }
})
</script>

<style scoped>
.downloads-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.error-state {
  color: #dc3545;
}

.order-info {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: #666;
}

.download-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.download-item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border: 1px solid #eee;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.download-item--active {
  border-left: 4px solid #2d7d46;
  background-color: #f8fdf9;
}

.download-item--expired {
  border-left: 4px solid #dc3545;
  background-color: #fdf8f8;
  opacity: 0.75;
}

.download-item__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.download-item__filename {
  font-weight: 600;
  font-size: 1rem;
}

.download-item__remaining {
  font-size: 0.875rem;
  color: #555;
}

.download-item__expiry {
  font-size: 0.8rem;
  color: #888;
}

.download-item__actions {
  flex-shrink: 0;
  margin-left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.download-item__error {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 0.875rem;
}

.download-item__error p {
  margin: 0 0 0.5rem 0;
  color: #856404;
}

.btn-download {
  padding: 0.5rem 1.25rem;
  background-color: #2d7d46;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-download:hover:not(:disabled) {
  background-color: #236b38;
}

.btn-download:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-download--disabled {
  background-color: #999;
}

.btn-copy-link {
  padding: 0.375rem 0.75rem;
  background-color: #0d6efd;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  margin-right: 0.5rem;
}

.btn-copy-link:hover {
  background-color: #0b5ed7;
}

.btn-dismiss {
  padding: 0.375rem 0.75rem;
  background-color: transparent;
  color: #856404;
  border: 1px solid #856404;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-dismiss:hover {
  background-color: #856404;
  color: #fff;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge--active {
  background-color: #d4edda;
  color: #155724;
}

.status-badge--expired {
  background-color: #f8d7da;
  color: #721c24;
}

.btn-back {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-decoration: none;
  color: #333;
  font-size: 0.875rem;
}

.btn-back:hover {
  background: #f5f5f5;
}
</style>
