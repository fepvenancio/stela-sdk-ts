import { describe, it, expect } from 'vitest'
import { typedData } from 'starknet'
import {
  getInscriptionOrderTypedData,
  getLendOfferTypedData,
  hashAssets,
} from '../../src/index.js'
import type { Asset } from '../../src/index.js'

/**
 * Cross-chain hash tests for SNIP-12 typed data.
 *
 * These tests pin the exact output of the SDK's typed data construction and
 * hashing so that any drift from the Cairo contract's SNIP-12 implementation
 * is caught immediately. The expected hashes were computed with starknet.js
 * v6 using the same struct definitions as the Cairo contract in src/snip12.cairo.
 *
 * If a test here fails after a code change, it means the SDK would produce
 * signatures the contract will reject.
 */

// --- Fixtures ---------------------------------------------------------------

const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
const CHAIN_ID = 'SN_SEPOLIA'

const BORROWER = ETH_ADDRESS // reuse a known valid felt252 address
const LENDER = STRK_ADDRESS

const debtAssets: Asset[] = [
  { asset_address: ETH_ADDRESS, asset_type: 'ERC20', value: 1_000_000_000_000_000_000n, token_id: 0n },
]

const interestAssets: Asset[] = [
  { asset_address: ETH_ADDRESS, asset_type: 'ERC20', value: 100_000_000_000_000_000n, token_id: 0n },
]

const collateralAssets: Asset[] = [
  { asset_address: ETH_ADDRESS, asset_type: 'ERC20', value: 2_000_000_000_000_000_000n, token_id: 0n },
]

// --- hashAssets --------------------------------------------------------------

describe('hashAssets', () => {
  it('produces a deterministic Poseidon hash for a single ERC20 asset', () => {
    const h = hashAssets(debtAssets)
    expect(h).toBe('0x5f8d18607ea17309f645bf24a09aeabecc40b6022fc3f12ee0ee50c8ed479f4')
  })

  it('produces different hashes for different amounts', () => {
    const h1 = hashAssets(debtAssets)
    const h2 = hashAssets(interestAssets)
    expect(h1).not.toBe(h2)
  })

  it('produces a different hash when the array is empty', () => {
    const empty = hashAssets([])
    const nonEmpty = hashAssets(debtAssets)
    expect(empty).not.toBe(nonEmpty)
  })
})

// --- InscriptionOrder typed data + hash -------------------------------------

describe('InscriptionOrder typed data hash', () => {
  const orderTD = getInscriptionOrderTypedData({
    borrower: BORROWER,
    debtAssets,
    interestAssets,
    collateralAssets,
    debtCount: 1,
    interestCount: 1,
    collateralCount: 1,
    duration: 86400n,
    deadline: 1700000000n,
    multiLender: false,
    nonce: 42n,
    chainId: CHAIN_ID,
  })

  it('has the correct primaryType', () => {
    expect(orderTD.primaryType).toBe('InscriptionOrder')
  })

  it('has the correct domain', () => {
    expect(orderTD.domain.name).toBe('Stela')
    expect(orderTD.domain.version).toBe('v1')
    expect(orderTD.domain.chainId).toBe(CHAIN_ID)
    expect(orderTD.domain.revision).toBe('1')
  })

  it('produces a struct hash matching the Cairo contract', () => {
    const structHash = typedData.getStructHash(
      orderTD.types,
      'InscriptionOrder',
      orderTD.message,
      typedData.TypedDataRevision.Active,
    )
    expect(structHash).toBe(
      '0x53a8dd9c9ae5bdb7796bc8cef22506a91223a7636dda44148beb392c461e4f4',
    )
  })

  it('produces a message hash matching the Cairo contract', () => {
    const msgHash = typedData.getMessageHash(orderTD, BORROWER)
    expect(msgHash).toBe(
      '0x3e4da358b71dec22d776f3fe427fb0cf0f6b6f9a7fe8d590c5c5d1317f687d',
    )
  })
})

// --- LendOffer typed data + hash --------------------------------------------

describe('LendOffer typed data hash', () => {
  // The LendOffer references the InscriptionOrder by its message hash
  const orderTD = getInscriptionOrderTypedData({
    borrower: BORROWER,
    debtAssets,
    interestAssets,
    collateralAssets,
    debtCount: 1,
    interestCount: 1,
    collateralCount: 1,
    duration: 86400n,
    deadline: 1700000000n,
    multiLender: false,
    nonce: 42n,
    chainId: CHAIN_ID,
  })
  const orderHash = typedData.getMessageHash(orderTD, BORROWER)

  const lendTD = getLendOfferTypedData({
    orderHash,
    lender: LENDER,
    issuedDebtPercentage: 10_000n, // 100% (MAX_BPS)
    nonce: 1n,
    chainId: CHAIN_ID,
    // lenderCommitment defaults to '0' (non-private)
  })

  it('has the correct primaryType', () => {
    expect(lendTD.primaryType).toBe('LendOffer')
  })

  it('encodes issued_debt_percentage as a u256 struct', () => {
    const msg = lendTD.message as Record<string, unknown>
    const pct = msg.issued_debt_percentage as { low: string; high: string }
    expect(pct.low).toBe('10000')
    expect(pct.high).toBe('0')
  })

  it('includes lender_commitment in the message', () => {
    const msg = lendTD.message as Record<string, unknown>
    expect(msg.lender_commitment).toBe('0')
  })

  it('produces a deterministic struct hash', () => {
    const structHash = typedData.getStructHash(
      lendTD.types,
      'LendOffer',
      lendTD.message,
      typedData.TypedDataRevision.Active,
    )
    // Re-derive with same inputs to verify determinism
    const lendTD2 = getLendOfferTypedData({
      orderHash,
      lender: LENDER,
      issuedDebtPercentage: 10_000n,
      nonce: 1n,
      chainId: CHAIN_ID,
    })
    const structHash2 = typedData.getStructHash(
      lendTD2.types,
      'LendOffer',
      lendTD2.message,
      typedData.TypedDataRevision.Active,
    )
    expect(structHash).toBe(structHash2)
    expect(structHash).not.toBe('0x0')
  })

  it('produces a deterministic message hash', () => {
    const msgHash = typedData.getMessageHash(lendTD, LENDER)
    const msgHash2 = typedData.getMessageHash(lendTD, LENDER)
    expect(msgHash).toBe(msgHash2)
    expect(msgHash).not.toBe('0x0')
  })

  it('produces a different hash with non-zero lenderCommitment', () => {
    const privateTD = getLendOfferTypedData({
      orderHash,
      lender: LENDER,
      issuedDebtPercentage: 10_000n,
      nonce: 1n,
      chainId: CHAIN_ID,
      lenderCommitment: '0xdeadbeef',
    })
    const privateHash = typedData.getMessageHash(privateTD, LENDER)
    const publicHash = typedData.getMessageHash(lendTD, LENDER)
    expect(privateHash).not.toBe(publicHash)
  })
})
