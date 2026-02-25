import { describe, it, expect } from 'vitest'
import { buildSignedOrderTypedData, splitU256 } from '../../src/signing/sign-order.js'
import type { SignedOrder } from '../../src/types/matching.js'

const sampleOrder: SignedOrder = {
  maker: '0x123abc',
  allowed_taker: '0x0',
  inscription_id: '42',
  bps: '10000',
  deadline: 1700000000,
  nonce: '0xff',
  min_fill_bps: '1000',
}

describe('splitU256', () => {
  it('splits zero correctly', () => {
    const result = splitU256('0')
    expect(result.low).toBe('0x0')
    expect(result.high).toBe('0x0')
  })

  it('splits small value (fits in low)', () => {
    const result = splitU256('42')
    expect(result.low).toBe('0x2a')
    expect(result.high).toBe('0x0')
  })

  it('splits value at 2^128 boundary', () => {
    // 2^128 = 340282366920938463463374607431768211456
    const result = splitU256('340282366920938463463374607431768211456')
    expect(result.low).toBe('0x0')
    expect(result.high).toBe('0x1')
  })

  it('splits value with both low and high parts', () => {
    // 2^128 + 1 = 340282366920938463463374607431768211457
    const result = splitU256('340282366920938463463374607431768211457')
    expect(result.low).toBe('0x1')
    expect(result.high).toBe('0x1')
  })
})

describe('buildSignedOrderTypedData', () => {
  it('has correct primaryType', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    expect(td.primaryType).toBe('SignedOrder')
  })

  it('has correct domain fields', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    expect(td.domain.name).toBe('Stela')
    expect(td.domain.version).toBe('1')
    expect(td.domain.chainId).toBe('SN_SEPOLIA')
  })

  it('has StarknetDomain type with 3 shortstring fields', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    const domainType = td.types.StarknetDomain
    expect(domainType).toHaveLength(3)
    expect(domainType[0]).toEqual({ name: 'name', type: 'shortstring' })
    expect(domainType[1]).toEqual({ name: 'chainId', type: 'shortstring' })
    expect(domainType[2]).toEqual({ name: 'version', type: 'shortstring' })
  })

  it('has SignedOrder type with 7 fields in Cairo struct order', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    const orderType = td.types.SignedOrder
    expect(orderType).toHaveLength(7)
    expect(orderType[0].name).toBe('maker')
    expect(orderType[1].name).toBe('allowed_taker')
    expect(orderType[2].name).toBe('inscription_id')
    expect(orderType[3].name).toBe('bps')
    expect(orderType[4].name).toBe('deadline')
    expect(orderType[5].name).toBe('nonce')
    expect(orderType[6].name).toBe('min_fill_bps')
  })

  it('has u256 type with low/high u128 fields', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    const u256Type = td.types.u256
    expect(u256Type).toEqual([
      { name: 'low', type: 'u128' },
      { name: 'high', type: 'u128' },
    ])
  })

  it('has u256 message fields as { low, high } objects', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    const msg = td.message

    // inscription_id: '42' → { low: '0x2a', high: '0x0' }
    expect(msg.inscription_id).toEqual({ low: '0x2a', high: '0x0' })

    // bps: '10000' → { low: '0x2710', high: '0x0' }
    expect(msg.bps).toEqual({ low: '0x2710', high: '0x0' })

    // min_fill_bps: '1000' → { low: '0x3e8', high: '0x0' }
    expect(msg.min_fill_bps).toEqual({ low: '0x3e8', high: '0x0' })
  })

  it('has deadline as a number (not string)', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    expect(td.message.deadline).toBe(1700000000)
    expect(typeof td.message.deadline).toBe('number')
  })

  it('passes nonce through as-is (hex string)', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    expect(td.message.nonce).toBe('0xff')
  })

  it('passes maker and allowed_taker as hex strings', () => {
    const td = buildSignedOrderTypedData(sampleOrder, 'SN_SEPOLIA', '0xcontract')
    expect(td.message.maker).toBe('0x123abc')
    expect(td.message.allowed_taker).toBe('0x0')
  })
})
