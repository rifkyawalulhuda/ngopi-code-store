/**
 * Shared helpers for product variants (license/package tiers).
 *
 * The store sells two kinds of things:
 *  - digital goods (source code, templates, ebooks) delivered as an uploaded file
 *  - services ("jasa") delivered by human work, with NO file at all
 *
 * These helpers keep the variant-selection and purchasability rules in one place
 * so the PDP, the buy page and the catalog cannot drift apart.
 */

/** Code of the option group that carries license tiers. */
export const LICENSE_GROUP_CODE = 'lisensi'

/** Facet codes that identify a service (no deliverable file). */
const FACET_PRODUCT_CATEGORY = 'product-category'
const FACET_PURCHASE_RULE = 'purchase-rule'
const FACET_PRODUCT_TYPE = 'product-type'
const CATEGORY_SERVICE = 'jasa'
const PURCHASE_RULE_REPEATABLE = 'repeatable'
const TYPE_SERVICE = 'service'

export interface VariantOption {
  id: string
  code: string
  name: string
  group?: { id: string; code: string; name: string } | null
}

/** Minimal facet shape needed to decide whether a product is a service. */
export interface FacetLike {
  code: string
  facet?: { code: string } | null
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

/**
 * Whether the product is a service (jasa) rather than a downloadable file.
 *
 * Several facet schemas exist across environments, so all known markers are
 * checked — a product is a service when ANY of them matches:
 *  - `product-category: jasa`      (production)
 *  - `purchase-rule: repeatable`   (production; you can buy it repeatedly)
 *  - `product-type: service`       (legacy/local schema)
 */
export function isServiceProduct(facetValues?: FacetLike[] | null): boolean {
  if (!facetValues?.length) return false
  return facetValues.some(
    (fv) =>
      (fv.facet?.code === FACET_PRODUCT_CATEGORY && fv.code === CATEGORY_SERVICE) ||
      (fv.facet?.code === FACET_PURCHASE_RULE && fv.code === PURCHASE_RULE_REPEATABLE) ||
      (fv.facet?.code === FACET_PRODUCT_TYPE && fv.code === TYPE_SERVICE),
  )
}

/**
 * Whether selling this product requires an uploaded file.
 *
 * Services never need one. When the facets are unknown we assume a file IS
 * required: blocking a sale is recoverable, silently selling something that can
 * never be delivered is not.
 */
export function productRequiresFile(facetValues?: FacetLike[] | null): boolean {
  return !isServiceProduct(facetValues)
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
 * storefront must not sell it. `digitalProductInfo` is only non-null once a file
 * exists for that variant.
 *
 * Services are the exception: they have no file by definition, so when the
 * product is a service (`requiresFile: false`) the variant is purchasable
 * regardless. Requiring a file here made every service permanently unsellable.
 *
 * @param options.requiresFile - false for service products. Defaults to true.
 */
export function isVariantPurchasable(
  variant: VariantLike | null | undefined,
  options: { requiresFile?: boolean } = {},
): boolean {
  if (options.requiresFile === false) return true
  return !!variant?.digitalProductInfo
}

export interface PickVariantOptions {
  /** License option code to prefer, e.g. from ?license=extended. */
  preferredLicenseCode?: string | null
  /** False for service products, which need no file. Defaults to true. */
  requiresFile?: boolean
}

/**
 * Choose which variant to show/select by default.
 *
 * Order of preference:
 *   1. the variant matching `preferredLicenseCode`, but only if purchasable
 *   2. the first purchasable variant
 *   3. the first variant (so the page still renders something)
 */
export function pickVariant(
  variants: VariantLike[] | null | undefined,
  options: PickVariantOptions = {},
): VariantLike | null {
  if (!variants?.length) return null

  const { preferredLicenseCode, requiresFile } = options

  if (preferredLicenseCode) {
    const match = variants.find((v) => getLicenseCode(v) === preferredLicenseCode)
    if (match && isVariantPurchasable(match, { requiresFile })) return match
  }

  return (
    variants.find((v) => isVariantPurchasable(v, { requiresFile })) ?? variants[0]
  )
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
export function getVariantPriceRange(
  variants: VariantLike[] | null | undefined,
  options: { requiresFile?: boolean } = {},
): { min: number; max: number; isRange: boolean } | null {
  const prices = (variants ?? [])
    .filter((v) => isVariantPurchasable(v, options))
    .map((v) => v.price)
    .filter((p) => typeof p === 'number')

  if (!prices.length) return null

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, isRange: min !== max }
}
