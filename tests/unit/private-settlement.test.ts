import { describe, it, expect } from 'vitest'
import { typedData } from 'starknet'
import {
  getLendOfferTypedData,
  getPrivateLendOfferTypedData,
  computeDepositCommitment,
} from '../../src/index.js'

// --- Fixtures ---------------------------------------------------------------

const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
const CHAIN_ID = 'SN_SEPOLIA'
const ORDER_HASH = '0x1234567890abcdef'
const DEPOSITOR = '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310'

// --- getPrivateLendOfferTypedData -------------------------------------------

describe('getPrivateLendOfferTypedData', () => {
  const depositCommitment = '0xdeadbeef'

  const privateTD = getPrivateLendOfferTypedData({
    orderHash: ORDER_HASH,
    issuedDebtPercentage: 10_000n,
    nonce: 1n,
    chainId: CHAIN_ID,
    depositCommitment,
  })

  it('has primaryType LendOffer', () => {
    expect(privateTD.primaryType).toBe('LendOffer')
  })

  it('sets lender to zero address', () => {
    const msg = privateTD.message as Record<string, unknown>
    expect(msg.lender).toBe('0x0')
  })

  it('sets lender_commitment to the deposit commitment', () => {
    const msg = privateTD.message as Record<string, unknown>
    expect(msg.lender_commitment).toBe(depositCommitment)
  })

  it('produces the same typed data as getLendOfferTypedData with lender=0x0', () => {
    const equivalentTD = getLendOfferTypedData({
      orderHash: ORDER_HASH,
      lender: '0x0',
      issuedDebtPercentage: 10_000n,
      nonce: 1n,
      chainId: CHAIN_ID,
      lenderCommitment: depositCommitment,
    })

    // Deep equality of the typed data structures
    expect(privateTD).toEqual(equivalentTD)
  })

  it('produces a deterministic struct hash', () => {
    const structHash1 = typedData.getStructHash(
      privateTD.types,
      'LendOffer',
      privateTD.message,
      typedData.TypedDataRevision.Active,
    )
    const privateTD2 = getPrivateLendOfferTypedData({
      orderHash: ORDER_HASH,
      issuedDebtPercentage: 10_000n,
      nonce: 1n,
      chainId: CHAIN_ID,
      depositCommitment,
    })
    const structHash2 = typedData.getStructHash(
      privateTD2.types,
      'LendOffer',
      privateTD2.message,
      typedData.TypedDataRevision.Active,
    )
    expect(structHash1).toBe(structHash2)
    expect(structHash1).not.toBe('0x0')
  })

  it('produces a different hash than a non-private offer', () => {
    const publicTD = getLendOfferTypedData({
      orderHash: ORDER_HASH,
      lender: STRK_ADDRESS,
      issuedDebtPercentage: 10_000n,
      nonce: 1n,
      chainId: CHAIN_ID,
    })
    const privateHash = typedData.getStructHash(
      privateTD.types,
      'LendOffer',
      privateTD.message,
      typedData.TypedDataRevision.Active,
    )
    const publicHash = typedData.getStructHash(
      publicTD.types,
      'LendOffer',
      publicTD.message,
      typedData.TypedDataRevision.Active,
    )
    expect(privateHash).not.toBe(publicHash)
  })
})

// --- computeDepositCommitment -----------------------------------------------

describe('computeDepositCommitment', () => {
  const TOKEN = ETH_ADDRESS
  const AMOUNT = 1_000_000_000_000_000_000n
  const SALT = 12345n

  it('produces a deterministic commitment', () => {
    const c1 = computeDepositCommitment(DEPOSITOR, TOKEN, AMOUNT, SALT)
    const c2 = computeDepositCommitment(DEPOSITOR, TOKEN, AMOUNT, SALT)
    expect(c1).toBe(c2)
    expect(c1).not.toBe('0x0')
  })

  it('produces different commitments for different depositors', () => {
    const other = '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b'
    const c1 = computeDepositCommitment(DEPOSITOR, TOKEN, AMOUNT, SALT)
    const c2 = computeDepositCommitment(other, TOKEN, AMOUNT, SALT)
    expect(c1).not.toBe(c2)
  })

  it('produces different commitments for different tokens', () => {
    const c1 = computeDepositCommitment(DEPOSITOR, ETH_ADDRESS, AMOUNT, SALT)
    const c2 = computeDepositCommitment(DEPOSITOR, STRK_ADDRESS, AMOUNT, SALT)
    expect(c1).not.toBe(c2)
  })

  it('produces different commitments for different amounts', () => {
    const c1 = computeDepositCommitment(DEPOSITOR, TOKEN, 500n, SALT)
    const c2 = computeDepositCommitment(DEPOSITOR, TOKEN, 1000n, SALT)
    expect(c1).not.toBe(c2)
  })

  it('produces different commitments for different salts', () => {
    const c1 = computeDepositCommitment(DEPOSITOR, TOKEN, AMOUNT, 1n)
    const c2 = computeDepositCommitment(DEPOSITOR, TOKEN, AMOUNT, 2n)
    expect(c1).not.toBe(c2)
  })

  it('handles large u256 amounts', () => {
    const largeAmount = (1n << 200n) + 42n
    const c = computeDepositCommitment(DEPOSITOR, TOKEN, largeAmount, SALT)
    expect(c).not.toBe('0x0')
    // Deterministic
    const c2 = computeDepositCommitment(DEPOSITOR, TOKEN, largeAmount, SALT)
    expect(c).toBe(c2)
  })
})

// --- buildShieldDeposit (via InscriptionClient) -----------------------------

describe('buildShieldDeposit calldata', () => {
  // We test the calldata structure directly without instantiating a full client
  // by importing the client and using a minimal mock.
  // Since InscriptionClient requires a provider, we test the structure logic here.

  it('produces correct calldata shape', async () => {
    const { InscriptionClient } = await import('../../src/client/inscription-client.js')

    // Minimal mock provider
    const mockProvider = {} as any
    const client = new InscriptionClient({
      stelaAddress: '0x123',
      provider: mockProvider,
    })

    const privacyPool = '0xpool'
    const token = ETH_ADDRESS
    const amount = 1_000_000_000_000_000_000n
    const commitment = '0xabcdef'

    const call = client.buildShieldDeposit({
      privacyPoolAddress: privacyPool,
      token,
      amount,
      commitment,
    })

    expect(call.contractAddress).toBe(privacyPool)
    expect(call.entrypoint).toBe('shield')
    // calldata: [token, amount_low, amount_high, commitment]
    expect(call.calldata).toHaveLength(4)
    expect(call.calldata[0]).toBe(token)
    // amount u256: low and high parts (hex formatted by toU256)
    expect(BigInt(call.calldata[1])).toBe(amount)
    expect(call.calldata[2]).toBe('0x0')
    expect(call.calldata[3]).toBe(commitment)
  })
})

// --- buildSettlePrivate (via InscriptionClient) ------------------------------

describe('buildSettlePrivate calldata', () => {
  it('forces lender to zero address', async () => {
    const { InscriptionClient } = await import('../../src/client/inscription-client.js')

    const mockProvider = {} as any
    const client = new InscriptionClient({
      stelaAddress: '0x123',
      provider: mockProvider,
    })

    const commitment = '0xdeadbeef'

    const call = client.buildSettlePrivate({
      order: {
        borrower: DEPOSITOR,
        debtHash: '0x1',
        interestHash: '0x2',
        collateralHash: '0x3',
        debtCount: 1,
        interestCount: 1,
        collateralCount: 1,
        duration: 3600n,
        deadline: 1700000000n,
        multiLender: false,
        nonce: 0n,
      },
      debtAssets: [{ asset_address: ETH_ADDRESS, asset_type: 'ERC20', value: 1000n, token_id: 0n }],
      interestAssets: [{ asset_address: ETH_ADDRESS, asset_type: 'ERC20', value: 100n, token_id: 0n }],
      collateralAssets: [{ asset_address: ETH_ADDRESS, asset_type: 'ERC20', value: 2000n, token_id: 0n }],
      borrowerSig: ['0xsig1', '0xsig2'],
      offer: {
        orderHash: '0xorder',
        issuedDebtPercentage: 10_000n,
        nonce: 0n,
        lenderCommitment: commitment,
      },
      lenderSig: ['0xlsig1', '0xlsig2'],
    })

    expect(call.entrypoint).toBe('settle')
    expect(call.contractAddress).toBe('0x123')

    // The lender field in the offer calldata should be '0x0'
    // Order: 11 fields
    // Each asset array: 1 (length) + assets * 6 (address + type + value_u256(2) + token_id_u256(2))
    // debt_assets: 1 + 1*6 = 7
    // interest_assets: 7
    // collateral_assets: 7
    // borrower_sig: 1 + 2 = 3
    // Total before offer: 11 + 7 + 7 + 7 + 3 = 35
    // Offer: orderHash, lender, issuedDebtPercentage_low, issuedDebtPercentage_high, nonce, lenderCommitment
    const offerStart = 35
    expect(call.calldata[offerStart]).toBe('0xorder')     // orderHash
    expect(call.calldata[offerStart + 1]).toBe('0x0')      // lender = zero address
    expect(call.calldata[offerStart + 4]).toBe('0')        // nonce
    expect(call.calldata[offerStart + 5]).toBe(commitment) // lenderCommitment
  })

  it('produces same calldata as buildSettle with explicit lender=0x0', async () => {
    const { InscriptionClient } = await import('../../src/client/inscription-client.js')

    const mockProvider = {} as any
    const client = new InscriptionClient({
      stelaAddress: '0x123',
      provider: mockProvider,
    })

    const sharedParams = {
      order: {
        borrower: DEPOSITOR,
        debtHash: '0x1',
        interestHash: '0x2',
        collateralHash: '0x3',
        debtCount: 1,
        interestCount: 1,
        collateralCount: 1,
        duration: 3600n,
        deadline: 1700000000n,
        multiLender: false,
        nonce: 0n,
      },
      debtAssets: [{ asset_address: ETH_ADDRESS, asset_type: 'ERC20' as const, value: 1000n, token_id: 0n }],
      interestAssets: [{ asset_address: ETH_ADDRESS, asset_type: 'ERC20' as const, value: 100n, token_id: 0n }],
      collateralAssets: [{ asset_address: ETH_ADDRESS, asset_type: 'ERC20' as const, value: 2000n, token_id: 0n }],
      borrowerSig: ['0xsig1', '0xsig2'],
      lenderSig: ['0xlsig1', '0xlsig2'],
    }

    const privateCall = client.buildSettlePrivate({
      ...sharedParams,
      offer: {
        orderHash: '0xorder',
        issuedDebtPercentage: 10_000n,
        nonce: 0n,
        lenderCommitment: '0xcommit',
      },
    })

    const manualCall = client.buildSettle({
      ...sharedParams,
      offer: {
        orderHash: '0xorder',
        lender: '0x0',
        issuedDebtPercentage: 10_000n,
        nonce: 0n,
        lenderCommitment: '0xcommit',
      },
    })

    expect(privateCall.calldata).toEqual(manualCall.calldata)
  })
})
