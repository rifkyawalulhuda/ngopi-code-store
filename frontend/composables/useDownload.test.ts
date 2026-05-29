import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatDateID,
  formatRemainingDownloads,
  isExpired,
  isMaxedOut,
  isDownloadAvailable,
  getUnavailableReason,
  mapDownloadError,
  useDownload,
  type DownloadItem,
} from './useDownload'

// Mock Apollo client
const mockQuery = vi.fn()
const mockMutate = vi.fn()

// Mock useNuxtApp as a global (Nuxt auto-import)
vi.stubGlobal('useNuxtApp', () => ({
  $apollo: {
    defaultClient: {
      query: mockQuery,
      mutate: mockMutate,
    },
  },
}))

// Mock window.location
const mockLocationHref = vi.fn()
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
})

describe('formatDateID', () => {
  it('formats a valid date string in Indonesian locale', () => {
    const result = formatDateID('2025-06-15T14:30:00Z')
    // Should contain Indonesian month name and date parts
    expect(result).toContain('2025')
    expect(result).toContain('Juni')
    expect(result).toContain('15')
  })

  it('returns "-" for invalid date string', () => {
    expect(formatDateID('invalid-date')).toBe('-')
    expect(formatDateID('')).toBe('-')
  })
})

describe('formatRemainingDownloads', () => {
  it('formats remaining downloads correctly', () => {
    expect(formatRemainingDownloads(2, 5)).toBe('3 of 5 remaining')
    expect(formatRemainingDownloads(0, 5)).toBe('5 of 5 remaining')
    expect(formatRemainingDownloads(5, 5)).toBe('0 of 5 remaining')
  })

  it('handles edge case of 1 max download', () => {
    expect(formatRemainingDownloads(0, 1)).toBe('1 of 1 remaining')
    expect(formatRemainingDownloads(1, 1)).toBe('0 of 1 remaining')
  })
})

describe('isExpired', () => {
  it('returns true for past dates', () => {
    expect(isExpired('2020-01-01T00:00:00Z')).toBe(true)
  })

  it('returns false for future dates', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    expect(isExpired(futureDate)).toBe(false)
  })
})

describe('isMaxedOut', () => {
  it('returns true when current equals max', () => {
    expect(isMaxedOut(5, 5)).toBe(true)
  })

  it('returns true when current exceeds max', () => {
    expect(isMaxedOut(6, 5)).toBe(true)
  })

  it('returns false when current is less than max', () => {
    expect(isMaxedOut(3, 5)).toBe(false)
  })
})

describe('isDownloadAvailable', () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString()
  const pastDate = '2020-01-01T00:00:00Z'

  it('returns true for active, non-expired, non-maxed item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 2,
      expiresAt: futureDate,
      isActive: true,
      downloadToken: 'token-123',
    }
    expect(isDownloadAvailable(item)).toBe(true)
  })

  it('returns false for inactive item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 2,
      expiresAt: futureDate,
      isActive: false,
      downloadToken: 'token-123',
    }
    expect(isDownloadAvailable(item)).toBe(false)
  })

  it('returns false for expired item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 2,
      expiresAt: pastDate,
      isActive: true,
      downloadToken: 'token-123',
    }
    expect(isDownloadAvailable(item)).toBe(false)
  })

  it('returns false for maxed-out item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 5,
      expiresAt: futureDate,
      isActive: true,
      downloadToken: 'token-123',
    }
    expect(isDownloadAvailable(item)).toBe(false)
  })
})

describe('getUnavailableReason', () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString()
  const pastDate = '2020-01-01T00:00:00Z'

  it('returns null for available item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 2,
      expiresAt: futureDate,
      isActive: true,
      downloadToken: 'token-123',
    }
    expect(getUnavailableReason(item)).toBeNull()
  })

  it('returns expiry reason for expired item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 2,
      expiresAt: pastDate,
      isActive: true,
      downloadToken: 'token-123',
    }
    expect(getUnavailableReason(item)).toBe('Download link telah kedaluwarsa')
  })

  it('returns limit reason for maxed-out item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 5,
      expiresAt: futureDate,
      isActive: true,
      downloadToken: 'token-123',
    }
    expect(getUnavailableReason(item)).toBe('Batas download telah tercapai')
  })

  it('returns inactive reason for inactive item', () => {
    const item: DownloadItem = {
      id: '1',
      fileName: 'test.zip',
      maxDownloads: 5,
      currentDownloads: 2,
      expiresAt: futureDate,
      isActive: false,
      downloadToken: 'token-123',
    }
    expect(getUnavailableReason(item)).toBe('Download tidak lagi aktif')
  })
})

describe('mapDownloadError', () => {
  it('maps FORBIDDEN to unauthorized message', () => {
    expect(mapDownloadError('FORBIDDEN')).toBe('Anda tidak memiliki akses untuk download ini')
    expect(mapDownloadError('403')).toBe('Anda tidak memiliki akses untuk download ini')
  })

  it('maps FORBIDDEN with limit message to limit reached', () => {
    expect(mapDownloadError('FORBIDDEN', 'Download limit reached')).toBe('Batas download telah tercapai')
    expect(mapDownloadError('403', 'download limit exceeded')).toBe('Batas download telah tercapai')
  })

  it('maps NOT_FOUND to not found message', () => {
    expect(mapDownloadError('NOT_FOUND')).toBe('Download tidak ditemukan')
    expect(mapDownloadError('404')).toBe('Download tidak ditemukan')
  })

  it('maps GONE to expired message', () => {
    expect(mapDownloadError('GONE')).toBe('Link download telah kedaluwarsa')
    expect(mapDownloadError('410')).toBe('Link download telah kedaluwarsa')
  })

  it('maps TOO_MANY_REQUESTS to rate limit message', () => {
    expect(mapDownloadError('TOO_MANY_REQUESTS')).toBe('Terlalu banyak permintaan, coba lagi nanti')
    expect(mapDownloadError('429')).toBe('Terlalu banyak permintaan, coba lagi nanti')
  })

  it('maps unknown error to generic message', () => {
    expect(mapDownloadError('UNKNOWN')).toBe('Gagal memulai download. Silakan coba lagi.')
    expect(mapDownloadError('')).toBe('Gagal memulai download. Silakan coba lagi.')
  })
})

describe('useDownload', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockMutate.mockReset()
  })

  it('fetches downloads successfully', async () => {
    const mockDownloads = [
      {
        id: '1',
        fileName: 'project.zip',
        maxDownloads: 5,
        currentDownloads: 2,
        expiresAt: '2025-12-31T23:59:59Z',
        isActive: true,
        downloadToken: 'abc-123',
      },
    ]

    mockQuery.mockResolvedValue({
      data: {
        orderByCode: {
          id: '1',
          code: 'ORDER123',
          state: 'Fulfilled',
          downloads: mockDownloads,
        },
      },
    })

    const { items, loading, error, fetchDownloads } = useDownload()

    await fetchDownloads('ORDER123')

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(items.value).toEqual(mockDownloads)
  })

  it('shows generic error for non-existent order', async () => {
    mockQuery.mockResolvedValue({
      data: {
        orderByCode: null,
      },
    })

    const { items, error, fetchDownloads } = useDownload()

    await fetchDownloads('INVALID_CODE')

    expect(error.value).toBe('Order tidak ditemukan. Periksa kembali kode order Anda.')
    expect(items.value).toEqual([])
  })

  it('shows generic error on network failure', async () => {
    mockQuery.mockRejectedValue(new Error('Network error'))

    const { items, error, fetchDownloads } = useDownload()

    await fetchDownloads('ORDER123')

    expect(error.value).toBe('Order tidak ditemukan. Periksa kembali kode order Anda.')
    expect(items.value).toEqual([])
  })

  it('sets loading state during fetch', async () => {
    let resolveQuery: (value: any) => void
    const queryPromise = new Promise((resolve) => {
      resolveQuery = resolve
    })
    mockQuery.mockReturnValue(queryPromise)

    const { loading, fetchDownloads } = useDownload()

    // Start the fetch but don't await it
    const fetchPromise = fetchDownloads('ORDER123')

    // Use nextTick to allow the synchronous part of fetchDownloads to execute
    await Promise.resolve()
    expect(loading.value).toBe(true)

    resolveQuery!({
      data: {
        orderByCode: {
          id: '1',
          code: 'ORDER123',
          state: 'Fulfilled',
          downloads: [],
        },
      },
    })

    await fetchPromise
    expect(loading.value).toBe(false)
  })

  describe('requestDownloadLink', () => {
    it('requests download link and redirects on success', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            url: 'https://minio.example.com/signed-url',
            expiresIn: 3600,
            remainingDownloads: 3,
            fileName: 'project.zip',
          },
        },
      })

      const { requestDownloadLink, getActionState, items } = useDownload()

      // Set up items so the local update works
      items.value = [{
        id: '1',
        fileName: 'project.zip',
        maxDownloads: 5,
        currentDownloads: 1,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
        downloadToken: 'token-abc',
      }]

      await requestDownloadLink('token-abc')

      const state = getActionState('token-abc')
      expect(state.downloading).toBe(false)
      expect(state.error).toBeNull()
      // Verify window.location.href was set
      expect(window.location.href).toBe('https://minio.example.com/signed-url')
    })

    it('updates local item download count on success', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            url: 'https://minio.example.com/signed-url',
            expiresIn: 3600,
            remainingDownloads: 2,
            fileName: 'project.zip',
          },
        },
      })

      const { requestDownloadLink, items } = useDownload()

      items.value = [{
        id: '1',
        fileName: 'project.zip',
        maxDownloads: 5,
        currentDownloads: 2,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
        downloadToken: 'token-abc',
      }]

      await requestDownloadLink('token-abc')

      expect(items.value[0].currentDownloads).toBe(3)
      expect(items.value[0].isActive).toBe(true)
    })

    it('deactivates item when remaining downloads is 0', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            url: 'https://minio.example.com/signed-url',
            expiresIn: 3600,
            remainingDownloads: 0,
            fileName: 'project.zip',
          },
        },
      })

      const { requestDownloadLink, items } = useDownload()

      items.value = [{
        id: '1',
        fileName: 'project.zip',
        maxDownloads: 5,
        currentDownloads: 4,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
        downloadToken: 'token-abc',
      }]

      await requestDownloadLink('token-abc')

      expect(items.value[0].currentDownloads).toBe(5)
      expect(items.value[0].isActive).toBe(false)
    })

    it('displays expired error from backend', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            errorCode: 'GONE',
            message: 'Download link has expired',
          },
        },
      })

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-expired')

      const state = getActionState('token-expired')
      expect(state.downloading).toBe(false)
      expect(state.error).toBe('Link download telah kedaluwarsa')
      expect(state.fallbackUrl).toBeNull()
    })

    it('displays limit reached error from backend', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            errorCode: 'FORBIDDEN',
            message: 'Download limit reached',
          },
        },
      })

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-maxed')

      const state = getActionState('token-maxed')
      expect(state.error).toBe('Batas download telah tercapai')
    })

    it('displays unauthorized error from backend', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            errorCode: 'FORBIDDEN',
            message: 'Unauthorized access',
          },
        },
      })

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-unauth')

      const state = getActionState('token-unauth')
      expect(state.error).toBe('Anda tidak memiliki akses untuk download ini')
    })

    it('displays rate limit error from backend', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            errorCode: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded',
          },
        },
      })

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-rate')

      const state = getActionState('token-rate')
      expect(state.error).toBe('Terlalu banyak permintaan, coba lagi nanti')
    })

    it('handles network error gracefully', async () => {
      mockMutate.mockRejectedValue(new Error('Network error'))

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-network')

      const state = getActionState('token-network')
      expect(state.downloading).toBe(false)
      expect(state.error).toBe('Gagal memulai download. Silakan coba lagi.')
    })

    it('handles null response gracefully', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: null,
        },
      })

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-null')

      const state = getActionState('token-null')
      expect(state.error).toBe('Gagal memulai download. Silakan coba lagi.')
    })

    it('handles GraphQL error with extensions code', async () => {
      const graphQLError = new Error('GraphQL error')
      ;(graphQLError as any).graphQLErrors = [{
        message: 'Download link expired',
        extensions: { code: 'GONE' },
      }]
      mockMutate.mockRejectedValue(graphQLError)

      const { requestDownloadLink, getActionState } = useDownload()

      await requestDownloadLink('token-gql-error')

      const state = getActionState('token-gql-error')
      expect(state.error).toBe('Link download telah kedaluwarsa')
    })
  })

  describe('copyDownloadLink', () => {
    it('copies fallback URL to clipboard', async () => {
      mockMutate.mockResolvedValue({
        data: {
          requestDownloadLink: {
            errorCode: 'GONE',
            message: 'expired',
          },
        },
      })

      const { requestDownloadLink, copyDownloadLink, downloadActionStates } = useDownload()

      // Manually set a fallback URL state
      downloadActionStates.value['token-copy'] = {
        downloading: false,
        error: 'Redirect failed',
        fallbackUrl: 'https://minio.example.com/signed-url',
      }

      const result = await copyDownloadLink('token-copy')

      expect(result).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://minio.example.com/signed-url')
    })

    it('returns false when no fallback URL exists', async () => {
      const { copyDownloadLink } = useDownload()

      const result = await copyDownloadLink('token-no-fallback')

      expect(result).toBe(false)
    })
  })

  describe('clearActionError', () => {
    it('clears error state for a token', () => {
      const { clearActionError, downloadActionStates, getActionState } = useDownload()

      downloadActionStates.value['token-clear'] = {
        downloading: false,
        error: 'Some error',
        fallbackUrl: 'https://example.com',
      }

      clearActionError('token-clear')

      const state = getActionState('token-clear')
      expect(state.error).toBeNull()
      // fallbackUrl should remain
      expect(state.fallbackUrl).toBe('https://example.com')
    })

    it('does nothing for non-existent token', () => {
      const { clearActionError, getActionState } = useDownload()

      // Should not throw
      clearActionError('non-existent')

      const state = getActionState('non-existent')
      expect(state.downloading).toBe(false)
      expect(state.error).toBeNull()
    })
  })
})
