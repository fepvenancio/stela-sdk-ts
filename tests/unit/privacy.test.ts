import { describe, it, expect } from 'vitest'
import {
  computeCommitment,
  computeNullifier,
  hashPair,
  generateSalt,
  createPrivateNote,
} from '../../src/index.js'

const OWNER = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
const INSCRIPTION_ID = 42n
const SHARES = 1000n
const SALT = '0xdead'

describe('computeCommitment', () => {
  it('produces a deterministic commitment', () => {
    const c1 = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, SALT)
    const c2 = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, SALT)
    expect(c1).toBe(c2)
    expect(c1).not.toBe('0x0')
  })

  it('produces different commitments for different owners', () => {
    const other = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
    const c1 = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, SALT)
    const c2 = computeCommitment(other, INSCRIPTION_ID, SHARES, SALT)
    expect(c1).not.toBe(c2)
  })

  it('produces different commitments for different inscription IDs', () => {
    const c1 = computeCommitment(OWNER, 1n, SHARES, SALT)
    const c2 = computeCommitment(OWNER, 2n, SHARES, SALT)
    expect(c1).not.toBe(c2)
  })

  it('produces different commitments for different shares', () => {
    const c1 = computeCommitment(OWNER, INSCRIPTION_ID, 500n, SALT)
    const c2 = computeCommitment(OWNER, INSCRIPTION_ID, 1000n, SALT)
    expect(c1).not.toBe(c2)
  })

  it('produces different commitments for different salts', () => {
    const c1 = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, '0x1')
    const c2 = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, '0x2')
    expect(c1).not.toBe(c2)
  })
})

describe('computeNullifier', () => {
  it('produces a deterministic nullifier', () => {
    const commitment = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, SALT)
    const n1 = computeNullifier(commitment, '0x123')
    const n2 = computeNullifier(commitment, '0x123')
    expect(n1).toBe(n2)
    expect(n1).not.toBe('0x0')
  })

  it('produces different nullifiers for different secrets', () => {
    const commitment = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, SALT)
    const n1 = computeNullifier(commitment, '0x1')
    const n2 = computeNullifier(commitment, '0x2')
    expect(n1).not.toBe(n2)
  })

  it('produces different nullifiers for different commitments', () => {
    const c1 = computeCommitment(OWNER, INSCRIPTION_ID, 500n, SALT)
    const c2 = computeCommitment(OWNER, INSCRIPTION_ID, 1000n, SALT)
    const n1 = computeNullifier(c1, '0x123')
    const n2 = computeNullifier(c2, '0x123')
    expect(n1).not.toBe(n2)
  })
})

describe('hashPair', () => {
  it('produces a deterministic hash', () => {
    const h1 = hashPair('0x111', '0x222')
    const h2 = hashPair('0x111', '0x222')
    expect(h1).toBe(h2)
    expect(h1).not.toBe('0x0')
  })

  it('is order-dependent (not commutative)', () => {
    const h1 = hashPair('0x111', '0x222')
    const h2 = hashPair('0x222', '0x111')
    expect(h1).not.toBe(h2)
  })
})

describe('generateSalt', () => {
  it('produces a hex string', () => {
    const salt = generateSalt()
    expect(salt).toMatch(/^0x[0-9a-f]+$/)
  })

  it('produces different salts each time', () => {
    const s1 = generateSalt()
    const s2 = generateSalt()
    expect(s1).not.toBe(s2)
  })
})

describe('createPrivateNote', () => {
  it('creates a note with a computed commitment', () => {
    const note = createPrivateNote(OWNER, INSCRIPTION_ID, SHARES, SALT)
    expect(note.owner).toBe(OWNER)
    expect(note.inscriptionId).toBe(INSCRIPTION_ID)
    expect(note.shares).toBe(SHARES)
    expect(note.salt).toBe(SALT)
    expect(note.commitment).not.toBe('0x0')
  })

  it('commitment matches manual computation', () => {
    const note = createPrivateNote(OWNER, INSCRIPTION_ID, SHARES, SALT)
    const manual = computeCommitment(OWNER, INSCRIPTION_ID, SHARES, SALT)
    expect(note.commitment).toBe(manual)
  })

  it('generates a random salt when none provided', () => {
    const note1 = createPrivateNote(OWNER, INSCRIPTION_ID, SHARES)
    const note2 = createPrivateNote(OWNER, INSCRIPTION_ID, SHARES)
    expect(note1.salt).not.toBe(note2.salt)
    expect(note1.commitment).not.toBe(note2.commitment)
  })
})
