/**
 * Shared helpers for product variants (license tiers).
 *
 * The store sells each product as one or more variants distinguished by a
 * "Lisensi" option group (Personal / Extended). These helpers keep the
 * variant-selection rules in one place so the PDP, the buy page and the catalog
 * cannot drift apart.
 */

/** Code of the option group that carries license tiers. */
export const LICENSE_GROUP_CODE = 'lisensi'

export interface VariantOption {
  id: string
  code: string
  name: string
  group?: { id: string; code: string; name: string } | null
}

export interface VariantLike {
  id: string
  name: string
  price: number
  options?: VariantOption[]
  customFields?: { originalPrice?: number | null } | null
  digitalProductInfo?: {
    fileSize: number
    mimeType: string
    maxDownloadsPerOrder: number
    downloadExpiryHours: number
  } | null
}

/** The option belonging to a given option group, if any. */
export function getVariantOption(
  variant: VariantLike | null | undefined,
  groupCode: string = LICENSE_GROUP_CODE,
): VariantOption | null {
  if (!variant?.options?.length) return null
  return variant.options.find((o) => o.group?.code === groupCode) ?? null
}

/** License option code for a variant, e.g. 'personal' | 'extended'. */
export function getLicenseCode(variant: VariantLike | null | undefined): string | null {
  return getVariantOption(variant)?.code ?? null
}

/** Human label for a variant's license, e.g. 'Personal'. */
export function getLicenseLabel(variant: VariantLike | null | undefined): string | null {
  return getVariantOption(variant)?.name ?? null
}

/**
 * Whether a variant can actually be delivered.
 *
 * A digital line with no uploaded file fulfils with zero downloads, so the
 * storefront must not sell it. `digitalProductInfo` is only non-null once a
 * file exists for that variant.
 */
export function isVariantPurchasable(variant: VariantLike | null | undefined): boolean {
  return !!variant?.digitalProductInfo
}

/**
 * Choose which variant to show/select by default.
 *
 * Order of preference:
 *   1. the variant matching `preferredLicenseCode` (e.g. from ?license=extended),
 *      but only if it is purchasable
 *   2. the first purchasable variant
 *   3. the first variant (so the page still renders something)
 */
export function pickVariant(
  variants: VariantLike[] | null | undefined,
  preferredLicenseCode?: string | null,
): VariantLike | null {
  if (!variants?.length) return null

  if (preferredLicenseCode) {
    const match = variants.find((v) => getLicenseCode(v) === preferredLicenseCode)
    if (match && isVariantPurchasable(match)) return match
  }

  return variants.find(isVariantPurchasable) ?? variants[0]
}

/** True when the product has more than one variant to choose from. */
export function hasMultipleVariants(variants: VariantLike[] | null | undefined): boolean {
  return (variants?.length ?? 0) > 1
}

/**
 * Min/max price across purchasable variants.
 * `isRange` is true when variants differ in price, so the catalog can show
 * "mulai dari" instead of implying a single price.
 */
export function getVariantPriceRange(variants: VariantLike[] | null | undefined): {
  min: number
  max: number
  isRange: boolean
} | null {
  const prices = (variants ?? [])
    .filter(isVariantPurchasable)
    .map((v) => v.price)
    .filter((p) => typeof p === 'number')

  if (!prices.length) return null

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, isRange: min !== max }
}
