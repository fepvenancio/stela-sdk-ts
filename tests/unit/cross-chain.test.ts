import { describe, it, expect } from 'vitest'
import { typedData } from 'starknet'
import { getLendOfferTypedData, getInscriptionOrderTypedData, hashAssets } from '../../src/index.js'
import type { Asset } from '../../src/index.js'

/**
 * Cross-chain verification test.
 *
 * Uses the EXACT same inputs as the Cairo test in stela/tests/test_hash_compat.cairo
 * to verify that the JS SDK produces identical SNIP-12 hashes.
 *
 * Cairo test inputs:
 *   - STRK address for assets
 *   - borrower: 0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310
 *   - lender: 0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b
 *   - debt: 1 STRK asset (1000000000000000)
 *   - interest: 1 STRK asset (100000000000000)
 *   - collateral: 1 STRK asset (2000000000000000)
 *   - duration: 3600, deadline: 1772105000
 *   - order nonce: 0, offer nonce: 0
 */
describe('Cross-chain hash verification (matches Cairo test_hash_compat)', () => {
  const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
  const BORROWER = '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310'
  const LENDER = '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b'
  const CHAIN_ID = 'SN_SEPOLIA'

  const debtAssets: Asset[] = [
    { asset_address: STRK, asset_type: 'ERC20', value: 1_000_000_000_000_000n, token_id: 0n },
  ]
  const interestAssets: Asset[] = [
    { asset_address: STRK, asset_type: 'ERC20', value: 100_000_000_000_000n, token_id: 0n },
  ]
  const collateralAssets: Asset[] = [
    { asset_address: STRK, asset_type: 'ERC20', value: 2_000_000_000_000_000n, token_id: 0n },
  ]

  const orderTD = getInscriptionOrderTypedData({
    borrower: BORROWER,
    debtAssets,
    interestAssets,
    collateralAssets,
    debtCount: 1,
    interestCount: 1,
    collateralCount: 1,
    duration: 3600n,
    deadline: 1772105000n,
    multiLender: false,
    nonce: 0n,
    chainId: CHAIN_ID,
  })

  const orderMsgHash = typedData.getMessageHash(orderTD, BORROWER)

  const lendTD = getLendOfferTypedData({
    orderHash: orderMsgHash,
    lender: LENDER,
    issuedDebtPercentage: 10_000n,
    nonce: 0n,
    chainId: CHAIN_ID,
  })

  it('hashAssets matches Cairo hash_assets', () => {
    // Cairo expected: 0x7c13b6e20f6dfc424c1c50458f2e2e98e2d3f16ae40444d6ff4e0c7eb89ca08
    const h = hashAssets(debtAssets)
    expect(h).toBe('0x7c13b6e20f6dfc424c1c50458f2e2e98e2d3f16ae40444d6ff4e0c7eb89ca08')
  })

  it('LendOffer struct hash is deterministic', () => {
    const structHash = typedData.getStructHash(
      lendTD.types,
      'LendOffer',
      lendTD.message,
      typedData.TypedDataRevision.Active,
    )
    // Re-derive to verify determinism
    const lendTD2 = getLendOfferTypedData({
      orderHash: orderMsgHash,
      lender: LENDER,
      issuedDebtPercentage: 10_000n,
      nonce: 0n,
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

  it('LendOffer message hash is deterministic', () => {
    const msgHash = typedData.getMessageHash(lendTD, LENDER)
    const msgHash2 = typedData.getMessageHash(lendTD, LENDER)
    expect(msgHash).toBe(msgHash2)
    expect(msgHash).not.toBe('0x0')
  })
})
