import { describe, it, expect } from 'vitest'
import {
  getVariantOption,
  getLicenseCode,
  getLicenseLabel,
  isVariantPurchasable,
  pickVariant,
  hasMultipleVariants,
  getVariantPriceRange,
  isServiceProduct,
  productRequiresFile,
  type VariantLike,
  type FacetLike,
} from './variants'

function variant(overrides: Partial<VariantLike> = {}): VariantLike {
  return {
    id: '1',
    name: 'Widget - Personal',
    price: 100000,
    options: [
      { id: 'o1', code: 'personal', name: 'Personal', group: { id: 'g1', code: 'lisensi', name: 'Lisensi' } },
    ],
    digitalProductInfo: {
      fileSize: 1000,
      mimeType: 'application/zip',
      maxDownloadsPerOrder: 5,
      downloadExpiryHours: 72,
    },
    ...overrides,
  }
}

function extended(overrides: Partial<VariantLike> = {}): VariantLike {
  return variant({
    id: '2',
    name: 'Widget - Extended',
    price: 300000,
    options: [
      { id: 'o2', code: 'extended', name: 'Extended', group: { id: 'g1', code: 'lisensi', name: 'Lisensi' } },
    ],
    ...overrides,
  })
}

/** A service variant: has a package option and, correctly, no file. */
function serviceVariant(overrides: Partial<VariantLike> = {}): VariantLike {
  return {
    id: '22',
    name: 'JASA-WEB-LITE',
    price: 500000,
    options: [
      { id: 'o3', code: 'lite', name: 'Lite', group: { id: 'g2', code: 'paket', name: 'Paket' } },
    ],
    digitalProductInfo: null,
    ...overrides,
  }
}

const SERVICE_FACETS: FacetLike[] = [
  { code: 'repeatable', facet: { code: 'purchase-rule' } },
  { code: 'jasa', facet: { code: 'product-category' } },
]
const DIGITAL_FACETS: FacetLike[] = [
  { code: 'one-time', facet: { code: 'purchase-rule' } },
  { code: 'source-code', facet: { code: 'product-category' } },
]

describe('getVariantOption', () => {
  it('finds the option in the lisensi group', () => {
    expect(getVariantOption(variant())?.code).toBe('personal')
  })

  it('ignores options from other groups', () => {
    const v = variant({
      options: [
        { id: 'x', code: 'zip', name: 'ZIP', group: { id: 'g2', code: 'format', name: 'Format' } },
      ],
    })
    expect(getVariantOption(v)).toBeNull()
  })

  it('returns null for a variant with no options', () => {
    expect(getVariantOption(variant({ options: [] }))).toBeNull()
    expect(getVariantOption(null)).toBeNull()
    expect(getVariantOption(undefined)).toBeNull()
  })
})

describe('getLicenseCode / getLicenseLabel', () => {
  it('reads code and label', () => {
    expect(getLicenseCode(extended())).toBe('extended')
    expect(getLicenseLabel(extended())).toBe('Extended')
  })

  it('returns null when there is no license option', () => {
    expect(getLicenseCode(variant({ options: [] }))).toBeNull()
    expect(getLicenseLabel(undefined)).toBeNull()
  })
})

describe('isServiceProduct', () => {
  it('detects a service from the product-category facet', () => {
    expect(isServiceProduct([{ code: 'jasa', facet: { code: 'product-category' } }])).toBe(true)
  })

  it('detects a service from the purchase-rule facet', () => {
    expect(isServiceProduct([{ code: 'repeatable', facet: { code: 'purchase-rule' } }])).toBe(true)
  })

  it('detects a service when both facets are present', () => {
    expect(isServiceProduct(SERVICE_FACETS)).toBe(true)
  })

  it('detects a service from the legacy product-type facet', () => {
    // Local/dev schema uses product-type: service instead of product-category: jasa.
    expect(isServiceProduct([{ code: 'service', facet: { code: 'product-type' } }])).toBe(true)
  })

  it('is false for a normal digital product', () => {
    expect(isServiceProduct(DIGITAL_FACETS)).toBe(false)
  })

  it('is false when facets are missing (cannot tell)', () => {
    expect(isServiceProduct([])).toBe(false)
    expect(isServiceProduct(null)).toBe(false)
    expect(isServiceProduct(undefined)).toBe(false)
  })

  it('does not match a same-named value under a different facet', () => {
    expect(isServiceProduct([{ code: 'jasa', facet: { code: 'something-else' } }])).toBe(false)
  })
})

describe('productRequiresFile', () => {
  it('is false for services', () => {
    expect(productRequiresFile(SERVICE_FACETS)).toBe(false)
  })

  it('is true for digital products', () => {
    expect(productRequiresFile(DIGITAL_FACETS)).toBe(true)
  })

  it('defaults to true when the facets are unknown (safer to block)', () => {
    expect(productRequiresFile(undefined)).toBe(true)
    expect(productRequiresFile([])).toBe(true)
  })
})

describe('isVariantPurchasable', () => {
  it('is true only when a file has been uploaded', () => {
    expect(isVariantPurchasable(variant())).toBe(true)
    expect(isVariantPurchasable(variant({ digitalProductInfo: null }))).toBe(false)
    expect(isVariantPurchasable(null)).toBe(false)
  })

  it('is true for a service variant with no file when requiresFile is false', () => {
    // The production regression: a service has no file, so requiring one made
    // every service tier permanently unsellable.
    expect(isVariantPurchasable(serviceVariant(), { requiresFile: false })).toBe(true)
  })

  it('still requires a file for a service variant when requiresFile is true', () => {
    expect(isVariantPurchasable(serviceVariant(), { requiresFile: true })).toBe(false)
  })
})

describe('pickVariant', () => {
  const personal = variant()
  const ext = extended()

  it('picks the variant matching the preferred license code', () => {
    expect(pickVariant([personal, ext], { preferredLicenseCode: 'extended' })?.id).toBe('2')
    expect(pickVariant([personal, ext], { preferredLicenseCode: 'personal' })?.id).toBe('1')
  })

  it('falls back to the first purchasable variant when no preference matches', () => {
    expect(pickVariant([personal, ext], { preferredLicenseCode: 'nonsense' })?.id).toBe('1')
  })

  it('ignores a preferred variant that is not purchasable', () => {
    const extNoFile = extended({ digitalProductInfo: null })
    expect(pickVariant([personal, extNoFile], { preferredLicenseCode: 'extended' })?.id).toBe('1')
  })

  it('falls back to the first variant when nothing is purchasable', () => {
    const a = variant({ digitalProductInfo: null })
    const b = extended({ digitalProductInfo: null })
    expect(pickVariant([a, b])?.id).toBe('1')
  })

  it('returns null for an empty list', () => {
    expect(pickVariant([])).toBeNull()
    expect(pickVariant(null)).toBeNull()
  })

  it('selects a fileless service variant when the product is a service', () => {
    const lite = serviceVariant()
    const premium = serviceVariant({ id: '24', name: 'JASA-WEB-PREMIUM', price: 1300000 })
    const picked = pickVariant([lite, premium], { requiresFile: false })
    expect(picked?.id).toBe('22')
  })
})

describe('hasMultipleVariants', () => {
  it('detects single vs multiple', () => {
    expect(hasMultipleVariants([variant()])).toBe(false)
    expect(hasMultipleVariants([variant(), extended()])).toBe(true)
    expect(hasMultipleVariants([])).toBe(false)
    expect(hasMultipleVariants(null)).toBe(false)
  })
})

describe('getVariantPriceRange', () => {
  it('reports a range when prices differ', () => {
    expect(getVariantPriceRange([variant(), extended()])).toEqual({
      min: 100000,
      max: 300000,
      isRange: true,
    })
  })

  it('reports no range when prices are equal', () => {
    expect(getVariantPriceRange([variant(), extended({ price: 100000 })])).toEqual({
      min: 100000,
      max: 100000,
      isRange: false,
    })
  })

  it('ignores unpurchasable variants', () => {
    const extNoFile = extended({ digitalProductInfo: null })
    expect(getVariantPriceRange([variant(), extNoFile])).toEqual({
      min: 100000,
      max: 100000,
      isRange: false,
    })
  })

  it('returns null when there is nothing purchasable', () => {
    expect(getVariantPriceRange([variant({ digitalProductInfo: null })])).toBeNull()
    expect(getVariantPriceRange([])).toBeNull()
  })

  it('includes fileless service variants when requiresFile is false', () => {
    const lite = serviceVariant({ price: 500000 })
    const premium = serviceVariant({ id: '24', price: 1300000 })
    expect(getVariantPriceRange([lite, premium], { requiresFile: false })).toEqual({
      min: 500000,
      max: 1300000,
      isRange: true,
    })
  })
})
