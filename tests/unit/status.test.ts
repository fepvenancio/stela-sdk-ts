import { describe, it, expect } from 'vitest'
import { computeStatus } from '../../src/index.js'

const BASE = {
  signed_at: 0,
  duration: 86400,
  issued_debt_percentage: 0,
  is_repaid: false,
  liquidated: false,
}

describe('computeStatus', () => {
  it('returns "repaid" when is_repaid is true', () => {
    expect(computeStatus({ ...BASE, is_repaid: true })).toBe('repaid')
  })

  it('returns "liquidated" when liquidated is true', () => {
    expect(computeStatus({ ...BASE, liquidated: true })).toBe('liquidated')
  })

  it('returns "cancelled" when status is "cancelled"', () => {
    expect(computeStatus({ ...BASE, status: 'cancelled' })).toBe('cancelled')
  })

  it('returns "open" for unsigned inscription', () => {
    expect(computeStatus(BASE)).toBe('open')
  })

  it('returns "expired" for unsigned inscription with passed deadline', () => {
    const now = 2000
    expect(
      computeStatus({ ...BASE, deadline: 1000 }, now),
    ).toBe('expired')
  })

  it('returns "open" for unsigned inscription with future deadline', () => {
    const now = 500
    expect(
      computeStatus({ ...BASE, deadline: 1000 }, now),
    ).toBe('open')
  })

  it('returns "partial" when issued_debt_percentage < 10000', () => {
    expect(
      computeStatus(
        { ...BASE, signed_at: 1000, issued_debt_percentage: 5000 },
        1500,
      ),
    ).toBe('partial')
  })

  it('returns "filled" when fully issued and not expired', () => {
    expect(
      computeStatus(
        { ...BASE, signed_at: 1000, issued_debt_percentage: 10000 },
        1500,
      ),
    ).toBe('filled')
  })

  it('returns "expired" when fully issued and duration elapsed', () => {
    // signed_at=1000, duration=86400, now=1000+86400+1=87401
    expect(
      computeStatus(
        { ...BASE, signed_at: 1000, issued_debt_percentage: 10000 },
        87401,
      ),
    ).toBe('expired')
  })

  it('repaid takes precedence over liquidated', () => {
    expect(
      computeStatus({ ...BASE, is_repaid: true, liquidated: true }),
    ).toBe('repaid')
  })

  it('liquidated takes precedence over other states', () => {
    expect(
      computeStatus({
        ...BASE,
        liquidated: true,
        signed_at: 1000,
        issued_debt_percentage: 10000,
      }),
    ).toBe('liquidated')
  })
})
