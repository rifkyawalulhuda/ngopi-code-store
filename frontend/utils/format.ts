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
