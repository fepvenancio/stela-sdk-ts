import { describe, it, expect } from 'vitest'
import { parseAmount, formatTokenValue } from '../../src/index.js'

describe('parseAmount', () => {
  it('converts "1.5" with 18 decimals', () => {
    expect(parseAmount('1.5', 18)).toBe(1_500_000_000_000_000_000n)
  })

  it('converts "1000" with 6 decimals', () => {
    expect(parseAmount('1000', 6)).toBe(1_000_000_000n)
  })

  it('converts "0.001" with 18 decimals', () => {
    expect(parseAmount('0.001', 18)).toBe(1_000_000_000_000_000n)
  })

  it('handles empty string', () => {
    expect(parseAmount('', 18)).toBe(0n)
  })

  it('handles "." input', () => {
    expect(parseAmount('.', 18)).toBe(0n)
  })

  it('handles whole numbers without decimals', () => {
    expect(parseAmount('42', 18)).toBe(42_000_000_000_000_000_000n)
  })

  it('truncates excess decimal places', () => {
    // "1.1234567" with 6 decimals should only use first 6 fractional digits
    expect(parseAmount('1.1234567', 6)).toBe(1_123_456n)
  })
})

describe('formatTokenValue', () => {
  it('formats zero', () => {
    expect(formatTokenValue('0', 18)).toBe('0')
  })

  it('formats null', () => {
    expect(formatTokenValue(null, 18)).toBe('0')
  })

  it('formats whole token amount', () => {
    expect(formatTokenValue('1000000000000000000', 18)).toBe('1')
  })

  it('formats fractional amount', () => {
    expect(formatTokenValue('1500000000000000000', 18)).toBe('1.5')
  })

  it('formats with 6 decimals', () => {
    expect(formatTokenValue('1000000', 6)).toBe('1')
    expect(formatTokenValue('1500000', 6)).toBe('1.5')
  })

  it('strips trailing zeros in fractional part', () => {
    expect(formatTokenValue('1100000000000000000', 18)).toBe('1.1')
  })

  it('handles 0 decimals', () => {
    expect(formatTokenValue('42', 0)).toBe('42')
  })

  it('roundtrips with parseAmount', () => {
    const original = '1.5'
    const raw = parseAmount(original, 18)
    const formatted = formatTokenValue(raw.toString(), 18)
    expect(formatted).toBe(original)
  })
})
