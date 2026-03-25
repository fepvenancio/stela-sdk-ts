import { describe, it, expect } from 'vitest'
import { formatSig, parseSigToArray } from '../../src/utils/signature.js'

describe('formatSig', () => {
  it('formats string array', () => {
    expect(formatSig(['0xabc', '0xdef'])).toEqual(['0xabc', '0xdef'])
  })

  it('converts bigint values to hex', () => {
    expect(formatSig([255n, 16n])).toEqual(['0xff', '0x10'])
  })

  it('formats {r, s} object', () => {
    expect(formatSig({ r: '0x1', s: '0x2' })).toEqual(['0x1', '0x2'])
  })

  it('formats {r, s} with bigint values', () => {
    expect(formatSig({ r: 10n, s: 20n })).toEqual(['0xa', '0x14'])
  })
})

describe('parseSigToArray', () => {
  it('passes through string array', () => {
    expect(parseSigToArray(['0xabc', '0xdef'])).toEqual(['0xabc', '0xdef'])
  })

  it('parses JSON array string', () => {
    expect(parseSigToArray('["0xabc", "0xdef"]')).toEqual(['0xabc', '0xdef'])
  })

  it('parses JSON object string', () => {
    expect(parseSigToArray('{"r": "0x1", "s": "0x2"}')).toEqual(['0x1', '0x2'])
  })

  it('parses CSV string', () => {
    expect(parseSigToArray('0xabc,0xdef')).toEqual(['0xabc', '0xdef'])
  })

  it('throws on single element CSV', () => {
    expect(() => parseSigToArray('0xabc')).toThrow('expected at least 2 elements')
  })

  it('throws on invalid JSON object (missing r)', () => {
    expect(() => parseSigToArray('{"x": "1", "y": "2"}')).toThrow('missing r or s')
  })
})
