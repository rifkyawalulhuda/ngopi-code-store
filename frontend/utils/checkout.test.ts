import { describe, it, expect } from 'vitest'
import { isOrderTotalConsistent } from './checkout'

describe('isOrderTotalConsistent', () => {
  it('accepts a matching total', () => {
    expect(isOrderTotalConsistent(447000, 447000)).toBe(true)
  })

  it('rejects a total higher than displayed (the overcharge bug)', () => {
    // Displayed the Extended tier only, but the order still held a leftover line.
    expect(isOrderTotalConsistent(447000, 596000)).toBe(false)
  })

  it('rejects a total lower than displayed', () => {
    expect(isOrderTotalConsistent(447000, 149000)).toBe(false)
  })

  it('rejects a duplicated order (retry added the item twice)', () => {
    // One click showed Rp 129.000; a retry left quantity 2 on the order.
    expect(isOrderTotalConsistent(129000, 258000)).toBe(false)
  })

  it('does not block checkout when a value is missing', () => {
    expect(isOrderTotalConsistent(null, 447000)).toBe(true)
    expect(isOrderTotalConsistent(447000, null)).toBe(true)
    expect(isOrderTotalConsistent(undefined, undefined)).toBe(true)
  })

  it('does not block checkout on non-numeric values', () => {
    expect(isOrderTotalConsistent(Number.NaN, 447000)).toBe(true)
    expect(isOrderTotalConsistent(447000, Number.NaN)).toBe(true)
  })

  it('compares numerically, not as strings', () => {
    expect(isOrderTotalConsistent(447000, 447000)).toBe(true)
    expect(isOrderTotalConsistent(0, 0)).toBe(true)
  })
})
