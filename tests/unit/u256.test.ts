import { describe, it, expect } from 'vitest'
import { toU256, fromU256, inscriptionIdToHex } from '../../src/index.js'

describe('toU256', () => {
  it('converts 0n to [0x0, 0x0]', () => {
    expect(toU256(0n)).toEqual(['0x0', '0x0'])
  })

  it('converts 123n to [0x7b, 0x0]', () => {
    expect(toU256(123n)).toEqual(['0x7b', '0x0'])
  })

  it('splits values larger than 2^128 into low and high', () => {
    const value = (1n << 128n) + 42n
    const [low, high] = toU256(value)
    expect(low).toBe('0x2a') // 42
    expect(high).toBe('0x1') // 1
  })

  it('throws for negative values', () => {
    expect(() => toU256(-1n)).toThrow(RangeError)
  })

  it('throws for values exceeding u256 max', () => {
    const tooLarge = (1n << 256n)
    expect(() => toU256(tooLarge)).toThrow(RangeError)
  })
})

describe('fromU256', () => {
  it('converts { low: 0n, high: 0n } to 0n', () => {
    expect(fromU256({ low: 0n, high: 0n })).toBe(0n)
  })

  it('converts { low: 123n, high: 0n } to 123n', () => {
    expect(fromU256({ low: 123n, high: 0n })).toBe(123n)
  })

  it('roundtrips with toU256', () => {
    const values = [0n, 1n, 123n, (1n << 128n) - 1n, (1n << 128n) + 42n, (1n << 255n)]
    for (const v of values) {
      const [lowStr, highStr] = toU256(v)
      const result = fromU256({ low: BigInt(lowStr), high: BigInt(highStr) })
      expect(result).toBe(v)
    }
  })

  it('throws for invalid components', () => {
    expect(() => fromU256({ low: -1n, high: 0n })).toThrow(RangeError)
    expect(() => fromU256({ low: 0n, high: (1n << 128n) })).toThrow(RangeError)
  })
})

describe('inscriptionIdToHex', () => {
  it('produces 0x-prefixed 64-char hex string', () => {
    const hex = inscriptionIdToHex({ low: 123n, high: 0n })
    expect(hex).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('encodes 123n correctly', () => {
    const hex = inscriptionIdToHex({ low: 123n, high: 0n })
    expect(hex).toBe('0x' + '0'.repeat(62) + '7b')
  })

  it('encodes 0n as all zeros', () => {
    const hex = inscriptionIdToHex({ low: 0n, high: 0n })
    expect(hex).toBe('0x' + '0'.repeat(64))
  })
})
