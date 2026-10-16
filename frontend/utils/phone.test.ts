import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPhone, phoneFieldError } from './phone'

describe('normalizePhone', () => {
  it('normalises the common Indonesian shapes to 62-prefixed digits', () => {
    expect(normalizePhone('081234567890')).toBe('6281234567890')
    expect(normalizePhone('+6281234567890')).toBe('6281234567890')
    expect(normalizePhone('6281234567890')).toBe('6281234567890')
    expect(normalizePhone('81234567890')).toBe('6281234567890')
  })

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone(' 0812 3456 7890 ')).toBe('6281234567890')
    expect(normalizePhone('(0812) 3456-7890')).toBe('6281234567890')
  })

  it('rejects empty, missing and non-numeric input', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone(undefined)).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
    expect(normalizePhone('---')).toBeNull()
  })

  it('rejects landlines and numbers that are too short or too long', () => {
    expect(normalizePhone('0211234567')).toBeNull() // Jakarta landline
    expect(normalizePhone('0812345')).toBeNull() // too short
    expect(normalizePhone('08123456789012345')).toBeNull() // too long
  })

  it('rejects non-Indonesian country codes', () => {
    expect(normalizePhone('+14155552671')).toBeNull()
    expect(normalizePhone('+60123456789')).toBeNull()
  })
})

describe('isValidPhone', () => {
  it('accepts a typical mobile number', () => {
    expect(isValidPhone('081234567890')).toBe(true)
  })

  it('rejects an invalid number', () => {
    expect(isValidPhone('12345')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })
})

describe('phoneFieldError', () => {
  it('requires a value when required is true', () => {
    expect(phoneFieldError('', { required: true })).toBe('Nomor WhatsApp wajib diisi')
    expect(phoneFieldError('   ', { required: true })).toBe('Nomor WhatsApp wajib diisi')
  })

  it('allows an empty value when not required', () => {
    expect(phoneFieldError('')).toBeNull()
    expect(phoneFieldError(null)).toBeNull()
    expect(phoneFieldError(undefined)).toBeNull()
  })

  it('flags a malformed number even when not required', () => {
    expect(phoneFieldError('abc')).toBe('Nomor WhatsApp tidak valid (contoh: 081234567890)')
    expect(phoneFieldError('0211234567')).toBe(
      'Nomor WhatsApp tidak valid (contoh: 081234567890)',
    )
  })

  it('accepts a valid number', () => {
    expect(phoneFieldError('081234567890', { required: true })).toBeNull()
    expect(phoneFieldError('+62 812-3456-7890')).toBeNull()
  })
})
