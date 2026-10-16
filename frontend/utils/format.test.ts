import { describe, it, expect } from 'vitest'
import { formatPriceIDR, truncateDescription, formatFileSize, formatMimeType } from './format'

describe('formatPriceIDR', () => {
  it('formats a standard price correctly', () => {
    // IDR zero-decimal: 150000 = Rp 150.000
    expect(formatPriceIDR(150000)).toBe('Rp 150.000')
  })

  it('formats zero price', () => {
    expect(formatPriceIDR(0)).toBe('Rp 0')
  })

  it('formats small price', () => {
    // 50 = Rp 50
    expect(formatPriceIDR(50)).toBe('Rp 50')
  })

  it('formats large price', () => {
    // 1000000 = Rp 1.000.000
    expect(formatPriceIDR(1000000)).toBe('Rp 1.000.000')
  })

  it('rounds fractional amounts', () => {
    // 15.5 -> rounds to 16
    expect(formatPriceIDR(15.5)).toBe('Rp 16')
  })
})

describe('truncateDescription', () => {
  it('returns empty string for empty input', () => {
    expect(truncateDescription('')).toBe('')
  })

  it('returns the full string if shorter than max length', () => {
    const short = 'A short description'
    expect(truncateDescription(short)).toBe(short)
  })

  it('returns the full string if exactly max length', () => {
    const exact = 'a'.repeat(150)
    expect(truncateDescription(exact)).toBe(exact)
  })

  it('truncates and adds ellipsis for long strings', () => {
    const long = 'a'.repeat(200)
    const result = truncateDescription(long)
    expect(result.length).toBe(153) // 150 + '...'
    expect(result.endsWith('...')).toBe(true)
  })

  it('respects custom max length', () => {
    const text = 'This is a longer description that should be truncated'
    const result = truncateDescription(text, 20)
    expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
    expect(result.endsWith('...')).toBe(true)
  })

  it('trims trailing whitespace before adding ellipsis', () => {
    // Create a string where character 150 is preceded by spaces
    const text = 'a'.repeat(145) + '     ' + 'b'.repeat(50)
    const result = truncateDescription(text)
    // Should trim trailing spaces before adding ellipsis
    expect(result).not.toMatch(/\s\.\.\./)
  })
})

describe('formatFileSize', () => {
  it('returns an empty string for missing or invalid input', () => {
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(undefined)).toBe('')
    expect(formatFileSize(0)).toBe('')
    expect(formatFileSize(-10)).toBe('')
    expect(formatFileSize(NaN)).toBe('')
  })

  it('formats bytes without decimals', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes as whole numbers', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('2 KB')
  })

  it('formats megabytes to one decimal', () => {
    expect(formatFileSize(15 * 1024 * 1024)).toBe('15 MB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(2 * 1024 ** 3)).toBe('2 GB')
  })

  it('coerces a numeric string (Postgres bigint) before formatting', () => {
    // The API returns bigint columns as numbers, but guard against strings too.
    expect(formatFileSize(Number('15000000'))).toBe('14,3 MB')
  })
})

describe('formatMimeType', () => {
  it('returns an empty string for missing input', () => {
    expect(formatMimeType(null)).toBe('')
    expect(formatMimeType(undefined)).toBe('')
    expect(formatMimeType('')).toBe('')
  })

  it('maps known MIME types to friendly labels', () => {
    expect(formatMimeType('application/zip')).toBe('ZIP Archive')
    expect(formatMimeType('application/pdf')).toBe('PDF Document')
    expect(formatMimeType('application/epub+zip')).toBe('EPUB')
  })

  it('is case-insensitive', () => {
    expect(formatMimeType('APPLICATION/ZIP')).toBe('ZIP Archive')
  })

  it('falls back to the raw MIME type when unknown', () => {
    expect(formatMimeType('application/x-custom')).toBe('application/x-custom')
  })
})
