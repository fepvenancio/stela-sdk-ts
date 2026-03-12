import { describe, it, expect } from 'vitest'
import {
  divCeil,
  proRataInterest,
  shareProportionBps,
  proportionalAssetValue,
  computePositionValue,
  accruedInterestWithBuffer,
  computeSafePositionFloor,
  DEFAULT_DUST_BUFFER_SECONDS,
  MAX_BPS,
  VIRTUAL_SHARE_OFFSET,
  convertToShares,
} from '../../src/index.js'
import type { Asset } from '../../src/index.js'

// ── divCeil ────────────────────────────────────────────────────────────

describe('divCeil', () => {
  it('returns 0 for 0 / anything', () => {
    expect(divCeil(0n, 100n)).toBe(0n)
  })

  it('exact division has no rounding', () => {
    expect(divCeil(100n, 10n)).toBe(10n)
  })

  it('rounds up when there is a remainder', () => {
    expect(divCeil(101n, 10n)).toBe(11n)
    expect(divCeil(1n, 2n)).toBe(1n)
    expect(divCeil(99n, 100n)).toBe(1n)
  })

  it('handles large values without overflow', () => {
    const a = 1_000_000_000_000_000_000n
    const b = 3n
    const result = divCeil(a, b)
    // ceil(1e18 / 3) = 333333333333333334
    expect(result).toBe(333_333_333_333_333_334n)
  })
})

// ── proRataInterest ────────────────────────────────────────────────────

describe('proRataInterest', () => {
  it('returns 0 when amount is 0', () => {
    expect(proRataInterest(0n, 500n, 1000n)).toBe(0n)
  })

  it('returns 0 when elapsed is 0', () => {
    expect(proRataInterest(1000n, 0n, 1000n)).toBe(0n)
  })

  it('returns full amount when elapsed >= duration', () => {
    expect(proRataInterest(1000n, 1000n, 1000n)).toBe(1000n)
    expect(proRataInterest(1000n, 2000n, 1000n)).toBe(1000n)
  })

  it('computes exact half', () => {
    expect(proRataInterest(1000n, 500n, 1000n)).toBe(500n)
  })

  it('rounds UP (ceiling) for lender protection', () => {
    // 1000 * 1 / 3 = 333.33... → ceil = 334
    expect(proRataInterest(1000n, 1n, 3n)).toBe(334n)
  })

  it('1 second into a 1-year loan charges at least 1 wei', () => {
    const oneYear = 365n * 24n * 3600n // 31536000
    const amount = 1_000_000_000_000_000_000n // 1e18
    const result = proRataInterest(amount, 1n, oneYear)
    expect(result).toBeGreaterThan(0n)
    // ceil(1e18 / 31536000) = 31709792
    expect(result).toBe(divCeil(amount, oneYear))
  })

  it('matches Cairo pro_rata_interest exactly', () => {
    // Test case: 100 STRK interest, 3600s elapsed, 86400s duration
    const amount = 100_000_000_000_000_000_000n // 100e18
    const elapsed = 3600n
    const duration = 86400n
    const expected = divCeil(amount * elapsed, duration)
    expect(proRataInterest(amount, elapsed, duration)).toBe(expected)
  })
})

// ── shareProportionBps ─────────────────────────────────────────────────

describe('shareProportionBps', () => {
  it('returns 0 when totalSupply is 0', () => {
    expect(shareProportionBps(100n, 0n)).toBe(0n)
  })

  it('returns MAX_BPS for sole holder', () => {
    const supply = 5000n * VIRTUAL_SHARE_OFFSET
    expect(shareProportionBps(supply, supply)).toBe(MAX_BPS)
  })

  it('returns ~5000 for half holder', () => {
    const supply = 10000n * VIRTUAL_SHARE_OFFSET
    const half = supply / 2n
    expect(shareProportionBps(half, supply)).toBe(5000n)
  })
})

// ── proportionalAssetValue ─────────────────────────────────────────────

describe('proportionalAssetValue', () => {
  it('returns 0 for zero shares', () => {
    expect(proportionalAssetValue(1000n, 0n, 100n)).toBe(0n)
  })

  it('returns 0 for zero supply', () => {
    expect(proportionalAssetValue(1000n, 50n, 0n)).toBe(0n)
  })

  it('returns full value for sole holder', () => {
    expect(proportionalAssetValue(1000n, 100n, 100n)).toBe(1000n)
  })

  it('returns half value for half shares', () => {
    expect(proportionalAssetValue(1000n, 50n, 100n)).toBe(500n)
  })

  it('rounds down (floor) matching contract behavior', () => {
    // 1000 * 1 / 3 = 333.33 → 333
    expect(proportionalAssetValue(1000n, 1n, 3n)).toBe(333n)
  })
})

// ── computePositionValue ───────────────────────────────────────────────

const makeAsset = (value: bigint, address = '0x1'): Asset => ({
  asset_address: address,
  asset_type: 'ERC20',
  value,
  token_id: 0n,
})

describe('computePositionValue', () => {
  it('computes full position for sole lender at 50% elapsed', () => {
    const totalSupply = convertToShares(MAX_BPS, 0n, 0n) // first fill 100%

    const result = computePositionValue({
      inscriptionId: '0x1',
      shares: totalSupply,
      totalSupply,
      debtAssets: [makeAsset(1000n)],
      interestAssets: [makeAsset(100n)],
      collateralAssets: [makeAsset(2000n, '0x2')],
      elapsed: 500n,
      duration: 1000n,
    })

    expect(result.shareBps).toBe(MAX_BPS)
    expect(result.debt[0].proportionalValue).toBe(1000n)
    expect(result.interest[0].fullInterest).toBe(100n)
    expect(result.interest[0].accruedInterest).toBe(50n) // 100 * 500 / 1000
    expect(result.collateral[0].proportionalValue).toBe(2000n)
  })

  it('computes partial position for 50% fill', () => {
    const fullShares = convertToShares(MAX_BPS, 0n, 0n)
    const halfShares = fullShares / 2n

    const result = computePositionValue({
      inscriptionId: '0x2',
      shares: halfShares,
      totalSupply: fullShares,
      debtAssets: [makeAsset(1000n)],
      interestAssets: [makeAsset(100n)],
      collateralAssets: [],
      elapsed: 1000n,
      duration: 1000n,
    })

    expect(result.debt[0].proportionalValue).toBe(500n)
    expect(result.interest[0].accruedInterest).toBe(50n) // full duration → full interest, but half shares
  })

  it('swaps (duration=0) always charge full interest', () => {
    const supply = convertToShares(MAX_BPS, 0n, 0n)

    const result = computePositionValue({
      inscriptionId: '0x3',
      shares: supply,
      totalSupply: supply,
      debtAssets: [makeAsset(1000n)],
      interestAssets: [makeAsset(100n)],
      collateralAssets: [],
      elapsed: 0n,
      duration: 0n,
    })

    expect(result.interest[0].accruedInterest).toBe(100n)
  })
})

// ── accruedInterestWithBuffer ──────────────────────────────────────────

describe('accruedInterestWithBuffer', () => {
  it('adds buffer seconds to elapsed time', () => {
    const amount = 1_000_000_000_000_000_000n // 1e18
    const elapsed = 3600n
    const duration = 86400n

    const withoutBuffer = proRataInterest(amount, elapsed, duration)
    const withBuffer = accruedInterestWithBuffer(amount, elapsed, duration, 60n)

    expect(withBuffer).toBeGreaterThan(withoutBuffer)
    expect(withBuffer).toBe(proRataInterest(amount, 3660n, duration))
  })

  it('caps at full amount even with large buffer', () => {
    expect(accruedInterestWithBuffer(1000n, 86000n, 86400n, 1000n)).toBe(1000n)
  })

  it('returns full amount for swaps (duration=0)', () => {
    expect(accruedInterestWithBuffer(1000n, 0n, 0n, 60n)).toBe(1000n)
  })

  it('uses default 60s buffer', () => {
    expect(DEFAULT_DUST_BUFFER_SECONDS).toBe(60n)
    const result = accruedInterestWithBuffer(86400n, 100n, 86400n)
    // Should be ceil(86400 * 160 / 86400) = 160
    expect(result).toBe(160n)
  })
})

// ── computeSafePositionFloor ───────────────────────────────────────────

describe('computeSafePositionFloor', () => {
  it('includes buffer in interest floor', () => {
    const supply = convertToShares(MAX_BPS, 0n, 0n)

    const { debtFloor, interestFloor } = computeSafePositionFloor({
      shares: supply,
      totalSupply: supply,
      debtAssets: [makeAsset(1000n)],
      interestAssets: [makeAsset(86400n)], // 1 wei per second
      elapsed: 3600n,
      duration: 86400n,
      bufferSeconds: 60n,
    })

    expect(debtFloor[0].proportionalValue).toBe(1000n)
    // Interest: ceil(86400 * 3660 / 86400) = 3660
    expect(interestFloor[0].proportionalValue).toBe(3660n)
  })
})
