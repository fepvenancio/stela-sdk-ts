import { describe, it, expect } from 'vitest'
import { parseEvent, parseEvents, SELECTORS } from '../../src/index.js'
import type { RawEvent } from '../../src/index.js'

const TX_HASH = '0xabc123'
const BLOCK = 100

function makeRaw(keys: string[], data: string[]): RawEvent {
  return { keys, data, transaction_hash: TX_HASH, block_number: BLOCK }
}

describe('SELECTORS', () => {
  it('computes selectors as hex strings', () => {
    for (const [name, value] of Object.entries(SELECTORS)) {
      expect(value).toMatch(/^0x[0-9a-f]+$/i)
    }
    // All selectors should be unique
    const values = Object.values(SELECTORS)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('parseEvent', () => {
  it('parses InscriptionCreated', () => {
    const raw = makeRaw(
      [SELECTORS.InscriptionCreated, '0x7b', '0x0', '0xdeadbeef'],
      ['0x1'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('InscriptionCreated')
    if (event!.type === 'InscriptionCreated') {
      expect(event.inscription_id).toBe(123n)
      expect(event.creator).toBe('0xdeadbeef')
      expect(event.is_borrow).toBe(true)
      expect(event.transaction_hash).toBe(TX_HASH)
      expect(event.block_number).toBe(BLOCK)
    }
  })

  it('parses InscriptionCreated with is_borrow=false', () => {
    const raw = makeRaw(
      [SELECTORS.InscriptionCreated, '0x1', '0x0', '0xcafe'],
      ['0x0'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    if (event!.type === 'InscriptionCreated') {
      expect(event.is_borrow).toBe(false)
    }
  })

  it('parses InscriptionSigned', () => {
    const raw = makeRaw(
      [SELECTORS.InscriptionSigned, '0x7b', '0x0', '0xborrower', '0xlender'],
      ['0x2710', '0x0', '0x64', '0x0'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('InscriptionSigned')
    if (event!.type === 'InscriptionSigned') {
      expect(event.inscription_id).toBe(123n)
      expect(event.borrower).toBe('0xborrower')
      expect(event.lender).toBe('0xlender')
      expect(event.issued_debt_percentage).toBe(10000n)
      expect(event.shares_minted).toBe(100n)
    }
  })

  it('parses InscriptionCancelled', () => {
    const raw = makeRaw(
      [SELECTORS.InscriptionCancelled, '0xa', '0x0'],
      ['0xcreator'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('InscriptionCancelled')
    if (event!.type === 'InscriptionCancelled') {
      expect(event.inscription_id).toBe(10n)
      expect(event.creator).toBe('0xcreator')
    }
  })

  it('parses InscriptionRepaid', () => {
    const raw = makeRaw(
      [SELECTORS.InscriptionRepaid, '0x5', '0x0'],
      ['0xrepayer'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('InscriptionRepaid')
    if (event!.type === 'InscriptionRepaid') {
      expect(event.inscription_id).toBe(5n)
      expect(event.repayer).toBe('0xrepayer')
    }
  })

  it('parses InscriptionLiquidated', () => {
    const raw = makeRaw(
      [SELECTORS.InscriptionLiquidated, '0x3', '0x0'],
      ['0xliquidator'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('InscriptionLiquidated')
    if (event!.type === 'InscriptionLiquidated') {
      expect(event.inscription_id).toBe(3n)
      expect(event.liquidator).toBe('0xliquidator')
    }
  })

  it('parses SharesRedeemed', () => {
    const raw = makeRaw(
      [SELECTORS.SharesRedeemed, '0x7b', '0x0', '0xredeemer'],
      ['0x3e8', '0x0'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('SharesRedeemed')
    if (event!.type === 'SharesRedeemed') {
      expect(event.inscription_id).toBe(123n)
      expect(event.redeemer).toBe('0xredeemer')
      expect(event.shares).toBe(1000n)
    }
  })

  it('parses TransferSingle', () => {
    const raw = makeRaw(
      [SELECTORS.TransferSingle, '0xoperator', '0xfrom', '0xto'],
      ['0x7b', '0x0', '0x64', '0x0'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    expect(event!.type).toBe('TransferSingle')
    if (event!.type === 'TransferSingle') {
      expect(event.operator).toBe('0xoperator')
      expect(event.from).toBe('0xfrom')
      expect(event.to).toBe('0xto')
      expect(event.id).toBe(123n)
      expect(event.value).toBe(100n)
    }
  })

  it('returns null for unrecognized selector', () => {
    const raw = makeRaw(['0xunknown'], ['0x1'])
    expect(parseEvent(raw)).toBeNull()
  })

  it('handles u256 with non-zero high part', () => {
    // inscription_id = (1n << 128n) + 42n
    const raw = makeRaw(
      [SELECTORS.InscriptionCreated, '0x2a', '0x1', '0xuser'],
      ['0x1'],
    )
    const event = parseEvent(raw)
    expect(event).not.toBeNull()
    if (event!.type === 'InscriptionCreated') {
      expect(event.inscription_id).toBe((1n << 128n) + 42n)
    }
  })
})

describe('parseEvents', () => {
  it('parses multiple events and skips unknown', () => {
    const events: RawEvent[] = [
      makeRaw([SELECTORS.InscriptionCreated, '0x1', '0x0', '0xaaa'], ['0x1']),
      makeRaw(['0xunknown_selector'], ['0x0']),
      makeRaw([SELECTORS.InscriptionRepaid, '0x2', '0x0'], ['0xbbb']),
    ]
    const parsed = parseEvents(events)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].type).toBe('InscriptionCreated')
    expect(parsed[1].type).toBe('InscriptionRepaid')
  })

  it('returns empty array for empty input', () => {
    expect(parseEvents([])).toEqual([])
  })

  it('returns empty array when all events are unrecognized', () => {
    const events: RawEvent[] = [
      makeRaw(['0xbad1'], ['0x0']),
      makeRaw(['0xbad2'], ['0x1']),
    ]
    expect(parseEvents(events)).toEqual([])
  })
})
