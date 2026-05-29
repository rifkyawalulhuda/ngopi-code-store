/**
 * Format a price value (in minor units) to Indonesian Rupiah format.
 * Vendure stores prices in minor units (cents), so for IDR we divide by 100.
 * Example: 15000000 -> "Rp 150.000"
 */
export function formatPriceIDR(priceInMinorUnits: number): string {
  const amount = Math.round(priceInMinorUnits / 100)
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
