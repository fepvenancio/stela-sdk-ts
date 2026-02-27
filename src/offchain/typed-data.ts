import type { TypedData } from 'starknet'
import type { Asset } from '../types/inscription.js'
import { hashAssets } from './hash.js'

/** Domain separator -- MUST match the Cairo contract's SNIP12Metadata */
const STELA_DOMAIN = {
  name: 'Stela',
  version: 'v1',
  chainId: '', // filled at call time
  revision: '1',
}

/**
 * Build SNIP-12 TypedData for a borrower's InscriptionOrder.
 * The borrower signs this off-chain to create an order without gas.
 */
export function getInscriptionOrderTypedData(params: {
  borrower: string
  debtAssets: Asset[]
  interestAssets: Asset[]
  collateralAssets: Asset[]
  debtCount: number
  interestCount: number
  collateralCount: number
  duration: bigint
  deadline: bigint
  multiLender: boolean
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
        { name: 'revision', type: 'shortstring' },
      ],
      InscriptionOrder: [
        { name: 'borrower', type: 'ContractAddress' },
        { name: 'debt_hash', type: 'felt' },
        { name: 'interest_hash', type: 'felt' },
        { name: 'collateral_hash', type: 'felt' },
        { name: 'debt_count', type: 'u128' },
        { name: 'interest_count', type: 'u128' },
        { name: 'collateral_count', type: 'u128' },
        { name: 'duration', type: 'u128' },
        { name: 'deadline', type: 'u128' },
        { name: 'multi_lender', type: 'bool' },
        { name: 'nonce', type: 'felt' },
      ],
    },
    primaryType: 'InscriptionOrder',
    domain: {
      ...STELA_DOMAIN,
      chainId: params.chainId,
    },
    message: {
      borrower: params.borrower,
      debt_hash: hashAssets(params.debtAssets),
      interest_hash: hashAssets(params.interestAssets),
      collateral_hash: hashAssets(params.collateralAssets),
      debt_count: params.debtCount.toString(),
      interest_count: params.interestCount.toString(),
      collateral_count: params.collateralCount.toString(),
      duration: params.duration.toString(),
      deadline: params.deadline.toString(),
      multi_lender: params.multiLender,
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a lender's LendOffer.
 * The lender signs this off-chain to accept an order without gas.
 *
 * @param lenderCommitment - Privacy commitment. When non-zero, shares are committed to the
 *   privacy pool's Merkle tree instead of minting ERC1155 to the lender. Defaults to '0'.
 */
export function getLendOfferTypedData(params: {
  orderHash: string
  lender: string
  issuedDebtPercentage: bigint
  nonce: bigint
  chainId: string
  /** Privacy commitment (default '0' = non-private). */
  lenderCommitment?: string
}): TypedData {
  return {
    types: {
      StarknetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
        { name: 'revision', type: 'shortstring' },
      ],
      LendOffer: [
        { name: 'order_hash', type: 'felt' },
        { name: 'lender', type: 'ContractAddress' },
        { name: 'issued_debt_percentage', type: 'u256' },
        { name: 'nonce', type: 'felt' },
        { name: 'lender_commitment', type: 'felt' },
      ],
      u256: [
        { name: 'low', type: 'u128' },
        { name: 'high', type: 'u128' },
      ],
    },
    primaryType: 'LendOffer',
    domain: {
      ...STELA_DOMAIN,
      chainId: params.chainId,
    },
    message: {
      order_hash: params.orderHash,
      lender: params.lender,
      issued_debt_percentage: {
        low: (params.issuedDebtPercentage & ((1n << 128n) - 1n)).toString(),
        high: (params.issuedDebtPercentage >> 128n).toString(),
      },
      nonce: params.nonce.toString(),
      lender_commitment: params.lenderCommitment ?? '0',
    },
  }
}
