import { describe, it, expect } from 'vitest'
import {
  convertToShares,
  scaleByPercentage,
  sharesToPercentage,
  calculateFeeShares,
  MAX_BPS,
  VIRTUAL_SHARE_OFFSET,
} from '../../src/index.js'

describe('convertToShares', () => {
  it('computes shares for first fill (totalSupply=0, currentPercentage=0)', () => {
    const shares = convertToShares(5000n, 0n, 0n)
    // 5000 * (0 + VIRTUAL_SHARE_OFFSET) / (0 + 1)
    expect(shares).toBe(5000n * VIRTUAL_SHARE_OFFSET)
  })

  it('computes shares for partial fill', () => {
    // After first fill of 5000 BPS, totalSupply = 5000 * VIRTUAL_SHARE_OFFSET
    const firstShares = convertToShares(5000n, 0n, 0n)
    const secondShares = convertToShares(3000n, firstShares, 5000n)
    // 3000 * (firstShares + OFFSET) / (5000 + 1)
    const expected = (3000n * (firstShares + VIRTUAL_SHARE_OFFSET)) / 5001n
    expect(secondShares).toBe(expected)
  })
})

describe('scaleByPercentage', () => {
  it('scales 1000 at 5000 BPS to 500', () => {
    expect(scaleByPercentage(1000n, 5000n)).toBe(500n)
  })

  it('scales 1000 at 10000 BPS to 1000', () => {
    expect(scaleByPercentage(1000n, 10000n)).toBe(1000n)
  })

  it('scales 1000 at 0 BPS to 0', () => {
    expect(scaleByPercentage(1000n, 0n)).toBe(0n)
  })

  it('scales 1000 at 2500 BPS to 250', () => {
    expect(scaleByPercentage(1000n, 2500n)).toBe(250n)
  })
})

describe('sharesToPercentage', () => {
  it('is approximately inverse of convertToShares', () => {
    const pct = 5000n
    const shares = convertToShares(pct, 0n, 0n)
    const recovered = sharesToPercentage(shares, 0n, 0n)
    // Should be very close to original percentage
    // With first fill: shares * 1 / OFFSET = 5000 * OFFSET / OFFSET = 5000
    expect(recovered).toBe(pct)
  })

  it('recovers percentage with existing supply', () => {
    const firstShares = convertToShares(5000n, 0n, 0n)
    const secondPct = 3000n
    const secondShares = convertToShares(secondPct, firstShares, 5000n)
    const recovered = sharesToPercentage(secondShares, firstShares, 5000n)
    // Due to integer division, may be off by a small amount
    const diff = recovered > secondPct ? recovered - secondPct : secondPct - recovered
    expect(diff).toBeLessThanOrEqual(1n)
  })
})

describe('calculateFeeShares', () => {
  it('calculates 10 BPS fee', () => {
    const shares = 10000n
    const fee = calculateFeeShares(shares, 10n)
    // 10000 * 10 / 10000 = 10
    expect(fee).toBe(10n)
  })

  it('calculates 0 BPS fee as 0', () => {
    expect(calculateFeeShares(10000n, 0n)).toBe(0n)
  })

  it('calculates 100% fee', () => {
    expect(calculateFeeShares(10000n, MAX_BPS)).toBe(10000n)
  })
})
