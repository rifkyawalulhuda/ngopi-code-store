import { describe, it, expect } from 'vitest'
import {
  getVariantOption,
  getLicenseCode,
  getLicenseLabel,
  isVariantPurchasable,
  pickVariant,
  hasMultipleVariants,
  getVariantPriceRange,
  type VariantLike,
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

describe('isVariantPurchasable', () => {
  it('is true only when a file has been uploaded', () => {
    expect(isVariantPurchasable(variant())).toBe(true)
    expect(isVariantPurchasable(variant({ digitalProductInfo: null }))).toBe(false)
    expect(isVariantPurchasable(null)).toBe(false)
  })
})

describe('pickVariant', () => {
  const personal = variant()
  const ext = extended()

  it('picks the variant matching the preferred license code', () => {
    expect(pickVariant([personal, ext], 'extended')?.id).toBe('2')
    expect(pickVariant([personal, ext], 'personal')?.id).toBe('1')
  })

  it('falls back to the first purchasable variant when no preference matches', () => {
    expect(pickVariant([personal, ext], 'nonsense')?.id).toBe('1')
  })

  it('ignores a preferred variant that is not purchasable', () => {
    const extNoFile = extended({ digitalProductInfo: null })
    expect(pickVariant([personal, extNoFile], 'extended')?.id).toBe('1')
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
})
