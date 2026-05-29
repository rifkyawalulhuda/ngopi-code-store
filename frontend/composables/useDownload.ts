import { ref } from 'vue'
import type { Ref } from 'vue'
import { GET_ORDER_DOWNLOADS } from '~/graphql/queries/downloads'
import { REQUEST_DOWNLOAD_LINK } from '~/graphql/mutations/downloads'

export interface DownloadItem {
  id: string
  fileName: string
  maxDownloads: number
  currentDownloads: number
  expiresAt: string
  isActive: boolean
  downloadToken: string
}

export interface DownloadLinkResult {
  url: string
  expiresIn: number
  remainingDownloads: number
  fileName: string
}

export interface DownloadActionState {
  downloading: boolean
  error: string | null
  fallbackUrl: string | null
}

export interface DownloadPageState {
  items: DownloadItem[]
  orderCode: string | null
  loading: boolean
  error: string | null
}

/**
 * Map HTTP error codes from backend to user-friendly Indonesian messages
 */
export function mapDownloadError(errorCode: string, message?: string): string {
  switch (errorCode) {
    case 'FORBIDDEN':
    case '403':
      if (message && message.toLowerCase().includes('limit')) {
        return 'Batas download telah tercapai'
      }
      return 'Anda tidak memiliki akses untuk download ini'
    case 'NOT_FOUND':
    case '404':
      return 'Download tidak ditemukan'
    case 'GONE':
    case '410':
      return 'Link download telah kedaluwarsa'
    case 'TOO_MANY_REQUESTS':
    case '429':
      return 'Terlalu banyak permintaan, coba lagi nanti'
    default:
      return 'Gagal memulai download. Silakan coba lagi.'
  }
}

/**
 * Format a date string to Indonesian locale (e.g., "15 Juni 2025, 14:30")
 */
export function formatDateID(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format remaining download count display (e.g., "3 of 5 remaining")
 */
export function formatRemainingDownloads(current: number, max: number): string {
  const remaining = max - current
  return `${remaining} of ${max} remaining`
}

/**
 * Determine if a download item is expired based on its expiry date
 */
export function isExpired(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt)
  return expiryDate.getTime() <= Date.now()
}

/**
 * Determine if a download item has reached its download limit
 */
export function isMaxedOut(current: number, max: number): boolean {
  return current >= max
}

/**
 * Determine if a download item is available for download
 * (active, not expired, and not at download limit)
 */
export function isDownloadAvailable(item: DownloadItem): boolean {
  return item.isActive && !isExpired(item.expiresAt) && !isMaxedOut(item.currentDownloads, item.maxDownloads)
}

/**
 * Get the unavailability reason for a download item
 */
export function getUnavailableReason(item: DownloadItem): string | null {
  if (isExpired(item.expiresAt)) {
    return 'Download link telah kedaluwarsa'
  }
  if (isMaxedOut(item.currentDownloads, item.maxDownloads)) {
    return 'Batas download telah tercapai'
  }
  if (!item.isActive) {
    return 'Download tidak lagi aktif'
  }
  return null
}

export function useDownload() {
  const items: Ref<DownloadItem[]> = ref([])
  const orderCode: Ref<string | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  // Per-item download action state, keyed by downloadToken
  const downloadActionStates: Ref<Record<string, DownloadActionState>> = ref({})

  async function fetchDownloads(code: string): Promise<void> {
    loading.value = true
    error.value = null
    orderCode.value = code
    items.value = []

    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_ORDER_DOWNLOADS,
        variables: { orderCode: code },
        fetchPolicy: 'network-only',
      })

      const order = data?.orderByCode

      if (!order || !order.downloads) {
        // Generic error - don't reveal whether order exists
        error.value = 'Order tidak ditemukan. Periksa kembali kode order Anda.'
        return
      }

      items.value = order.downloads
    } catch (err: any) {
      // Generic error for any failure - don't reveal order existence
      error.value = 'Order tidak ditemukan. Periksa kembali kode order Anda.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Request a secure download link from the backend and redirect to the pre-signed URL.
   * If redirect fails, provides a fallback URL for manual copy.
   */
  async function requestDownloadLink(downloadToken: string): Promise<void> {
    // Initialize action state for this token
    downloadActionStates.value[downloadToken] = {
      downloading: true,
      error: null,
      fallbackUrl: null,
    }

    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.mutate({
        mutation: REQUEST_DOWNLOAD_LINK,
        variables: { downloadToken },
      })

      const result = data?.requestDownloadLink

      if (!result) {
        downloadActionStates.value[downloadToken] = {
          downloading: false,
          error: 'Gagal memulai download. Silakan coba lagi.',
          fallbackUrl: null,
        }
        return
      }

      // Handle GraphQL error result
      if (result.errorCode) {
        downloadActionStates.value[downloadToken] = {
          downloading: false,
          error: mapDownloadError(result.errorCode, result.message),
          fallbackUrl: null,
        }
        return
      }

      // Success - attempt redirect to pre-signed URL
      const downloadUrl = result.url

      // Update the item's download count locally
      const itemIndex = items.value.findIndex(i => i.downloadToken === downloadToken)
      if (itemIndex !== -1) {
        const item = items.value[itemIndex]
        items.value[itemIndex] = {
          ...item,
          currentDownloads: item.maxDownloads - result.remainingDownloads,
          isActive: result.remainingDownloads > 0,
        }
      }

      // Attempt redirect
      try {
        window.location.href = downloadUrl
        downloadActionStates.value[downloadToken] = {
          downloading: false,
          error: null,
          fallbackUrl: null,
        }
      } catch {
        // Redirect failed (e.g., popup blocker, security policy)
        downloadActionStates.value[downloadToken] = {
          downloading: false,
          error: 'Redirect gagal. Gunakan tombol salin link di bawah untuk download manual.',
          fallbackUrl: downloadUrl,
        }
      }
    } catch (err: any) {
      // Network or unexpected error
      const errorCode = err?.graphQLErrors?.[0]?.extensions?.code || ''
      const errorMessage = err?.graphQLErrors?.[0]?.message || ''

      downloadActionStates.value[downloadToken] = {
        downloading: false,
        error: mapDownloadError(errorCode, errorMessage),
        fallbackUrl: null,
      }
    }
  }

  /**
   * Copy a fallback URL to clipboard
   */
  async function copyDownloadLink(downloadToken: string): Promise<boolean> {
    const state = downloadActionStates.value[downloadToken]
    if (!state?.fallbackUrl) return false

    try {
      await navigator.clipboard.writeText(state.fallbackUrl)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the download action state for a specific item
   */
  function getActionState(downloadToken: string): DownloadActionState {
    return downloadActionStates.value[downloadToken] || {
      downloading: false,
      error: null,
      fallbackUrl: null,
    }
  }

  /**
   * Clear the error state for a specific download token
   */
  function clearActionError(downloadToken: string): void {
    if (downloadActionStates.value[downloadToken]) {
      downloadActionStates.value[downloadToken] = {
        ...downloadActionStates.value[downloadToken],
        error: null,
      }
    }
  }

  return {
    items,
    orderCode,
    loading,
    error,
    downloadActionStates,
    fetchDownloads,
    requestDownloadLink,
    copyDownloadLink,
    getActionState,
    clearActionError,
  }
}
