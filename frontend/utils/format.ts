/**
 * Format a price value to Indonesian Rupiah format.
 * IDR is a zero-decimal currency, so Vendure (with IdrMoneyStrategy, precision 0)
 * stores the price as the actual Rupiah amount — no division needed.
 * Example: 150000 -> "Rp 150.000"
 */
export function formatPriceIDR(priceInRupiah: number): string {
  const amount = Math.round(priceInRupiah)
  return `Rp ${amount.toLocaleString('id-ID')}`
}

/**
 * Truncate a description to a maximum number of characters.
 * Adds ellipsis if truncated.
 */
export function truncateDescription(description: string, maxLength: number = 150): string {
  if (!description) return ''
  if (description.length <= maxLength) return description
  return description.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Format a byte count into a human-readable file size.
 * Example: 15728640 -> "15 MB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  // Whole numbers for bytes/KB, one decimal for larger units.
  const rounded = exponent <= 1 ? Math.round(value) : Math.round(value * 10) / 10
  const formatted = rounded.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  return `${formatted} ${units[exponent]}`
}

/**
 * Map a MIME type to a short, shopper-friendly format label.
 * Falls back to the raw MIME type when it is not recognised.
 */
export function formatMimeType(mimeType: string | null | undefined): string {
  if (!mimeType) return ''
  const map: Record<string, string> = {
    'application/zip': 'ZIP Archive',
    'application/x-zip-compressed': 'ZIP Archive',
    'application/pdf': 'PDF Document',
    'application/epub+zip': 'EPUB',
    'application/x-rar-compressed': 'RAR Archive',
    'application/gzip': 'GZIP Archive',
  }
  return map[mimeType.toLowerCase()] || mimeType
}
