import { describe, it, expect } from 'vitest'
import { formatAddress, normalizeAddress, addressesEqual, toHex } from '../../src/index.js'

describe('toHex', () => {
  it('returns string values as-is', () => {
    expect(toHex('0xabc')).toBe('0xabc')
  })

  it('converts bigint to hex', () => {
    expect(toHex(255n)).toBe('0xff')
  })

  it('converts number to hex', () => {
    expect(toHex(255)).toBe('0xff')
  })
})

describe('formatAddress', () => {
  it('truncates a long address', () => {
    const addr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
    const formatted = formatAddress(addr)
    expect(formatted).toMatch(/^0x[0-9a-fA-F]+\.\.\./)
    expect(formatted).toContain('...')
    expect(formatted.length).toBeLessThan(addr.length)
  })

  it('includes first 6 chars and last 4 chars', () => {
    const addr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
    const formatted = formatAddress(addr)
    expect(formatted.endsWith('4dc7')).toBe(true)
    expect(formatted.startsWith('0x049d')).toBe(true)
  })
})

describe('normalizeAddress', () => {
  it('pads a short address', () => {
    const normalized = normalizeAddress('0x1')
    expect(normalized.startsWith('0x')).toBe(true)
    expect(normalized.length).toBe(66) // 0x + 64 hex chars
  })

  it('lowercases hex chars', () => {
    const normalized = normalizeAddress('0xABC')
    expect(normalized).toBe(normalized.toLowerCase())
  })
})

describe('addressesEqual', () => {
  it('compares addresses case-insensitively', () => {
    const a = '0x049D36570D4E46F48E99674BD3FCC84644DDD6B96F7C741B1562B82F9E004DC7'
    const b = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
    expect(addressesEqual(a, b)).toBe(true)
  })

  it('handles different padding', () => {
    expect(addressesEqual('0x1', '0x0000000000000000000000000000000000000000000000000000000000000001')).toBe(true)
  })

  it('returns false for different addresses', () => {
    expect(addressesEqual('0x1', '0x2')).toBe(false)
  })
})
