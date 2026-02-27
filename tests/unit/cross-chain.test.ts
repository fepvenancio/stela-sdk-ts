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
 *   - lender_commitment: 0
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
    lenderCommitment: '0',
  })

  it('hashAssets matches Cairo hash_assets', () => {
    // Cairo expected: 0x7c13b6e20f6dfc424c1c50458f2e2e98e2d3f16ae40444d6ff4e0c7eb89ca08
    const h = hashAssets(debtAssets)
    expect(h).toBe('0x7c13b6e20f6dfc424c1c50458f2e2e98e2d3f16ae40444d6ff4e0c7eb89ca08')
  })

  it('LendOffer struct hash matches Cairo', () => {
    const structHash = typedData.getStructHash(
      lendTD.types,
      'LendOffer',
      lendTD.message,
      typedData.TypedDataRevision.Active,
    )
    // Verified against Cairo test_hash_compat output
    expect(structHash).toBe(
      '0x313e8908edf9c25b8312182cc9731be810b7d2e079ab593522df1b071e5738b',
    )
  })

  it('LendOffer message hash matches Cairo', () => {
    const msgHash = typedData.getMessageHash(lendTD, LENDER)
    // Verified against Cairo test_hash_compat output
    expect(msgHash).toBe(
      '0x486ec12329e274f9100ec02cc5eb87f570e7edc300ab8d58e18b517fa4b606e',
    )
  })
})
