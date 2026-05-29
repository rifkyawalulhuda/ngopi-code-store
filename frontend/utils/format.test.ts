import { describe, it, expect } from 'vitest'
import { formatPriceIDR, truncateDescription } from './format'

describe('formatPriceIDR', () => {
  it('formats a standard price correctly', () => {
    // 15000000 minor units = Rp 150.000
    expect(formatPriceIDR(15000000)).toBe('Rp 150.000')
  })

  it('formats zero price', () => {
    expect(formatPriceIDR(0)).toBe('Rp 0')
  })

  it('formats small price', () => {
    // 5000 minor units = Rp 50
    expect(formatPriceIDR(5000)).toBe('Rp 50')
  })

  it('formats large price', () => {
    // 100000000 minor units = Rp 1.000.000
    expect(formatPriceIDR(100000000)).toBe('Rp 1.000.000')
  })

  it('rounds fractional amounts', () => {
    // 1550 minor units = 15.5 -> rounds to 16
    expect(formatPriceIDR(1550)).toBe('Rp 16')
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
