import { describe, it, expect } from 'vitest'
import { computeInterestRate } from '../../src/math/rate.js'

describe('computeInterestRate', () => {
  it('computes basic ratio', () => {
    const rate = computeInterestRate(
      [{ asset_type: 'ERC20', value: '1000000' }],
      [{ asset_type: 'ERC20', value: '50000' }],
    )
    expect(rate).toBeCloseTo(0.05, 5)
  })

  it('returns null for zero debt', () => {
    expect(computeInterestRate(
      [{ asset_type: 'ERC20', value: '0' }],
      [{ asset_type: 'ERC20', value: '50000' }],
    )).toBeNull()
  })

  it('skips ERC721 assets', () => {
    const rate = computeInterestRate(
      [
        { asset_type: 'ERC20', value: '1000000' },
        { asset_type: 'ERC721', value: '999999999' },
      ],
      [
        { asset_type: 'ERC20', value: '100000' },
        { asset_type: 'ERC721', value: '1' },
      ],
    )
    expect(rate).toBeCloseTo(0.1, 5) // 100000/1000000
  })

  it('handles multiple fungible assets', () => {
    const rate = computeInterestRate(
      [
        { asset_type: 'ERC20', value: '500000' },
        { asset_type: 'ERC4626', value: '500000' },
      ],
      [{ asset_type: 'ERC20', value: '100000' }],
    )
    expect(rate).toBeCloseTo(0.1, 5) // 100000/1000000
  })

  it('returns null with empty debt', () => {
    expect(computeInterestRate([], [{ asset_type: 'ERC20', value: '100' }])).toBeNull()
  })

  it('handles empty or missing value', () => {
    const rate = computeInterestRate(
      [{ asset_type: 'ERC20', value: '1000' }],
      [{ asset_type: 'ERC20', value: '' }],
    )
    expect(rate).toBe(0)
  })
})
