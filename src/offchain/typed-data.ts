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
 */
export function getLendOfferTypedData(params: {
  orderHash: string
  lender: string
  issuedDebtPercentage: bigint
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
      LendOffer: [
        { name: 'order_hash', type: 'felt' },
        { name: 'lender', type: 'ContractAddress' },
        { name: 'issued_debt_percentage', type: 'u256' },
        { name: 'nonce', type: 'felt' },
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
    },
  }
}

/**
 * Build SNIP-12 TypedData for a lender's BatchLendOffer.
 * The lender signs this off-chain to accept multiple orders atomically.
 */
export function getBatchLendOfferTypedData(params: {
  batchHash: string
  count: number
  lender: string
  startNonce: bigint
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
      BatchLendOffer: [
        { name: 'batch_hash', type: 'felt' },
        { name: 'count', type: 'u128' },
        { name: 'lender', type: 'ContractAddress' },
        { name: 'start_nonce', type: 'felt' },
      ],
    },
    primaryType: 'BatchLendOffer',
    domain: {
      ...STELA_DOMAIN,
      chainId: params.chainId,
    },
    message: {
      batch_hash: params.batchHash,
      count: params.count.toString(),
      lender: params.lender,
      start_nonce: params.startNonce.toString(),
    },
  }
}

// ── T1 Typed Data Builders ─────────────────────────────────────────────

/** Helper to encode a u256 as the nested {low, high} struct SNIP-12 expects */
function u256Message(value: bigint): { low: string; high: string } {
  return {
    low: (value & ((1n << 128n) - 1n)).toString(),
    high: (value >> 128n).toString(),
  }
}

/** SNIP-12 StarknetDomain type definition (shared across all typed data) */
const STARKNET_DOMAIN_TYPE = [
  { name: 'name', type: 'shortstring' },
  { name: 'version', type: 'shortstring' },
  { name: 'chainId', type: 'shortstring' },
  { name: 'revision', type: 'shortstring' },
]

/** u256 sub-type definition for SNIP-12 */
const U256_TYPE = [
  { name: 'low', type: 'u128' },
  { name: 'high', type: 'u128' },
]

/**
 * Build SNIP-12 TypedData for a collection-wide lend offer (T1-2).
 * The lender offers to lend against any NFT from a given collection.
 */
export function getCollectionLendOfferTypedData(params: {
  lender: string
  debtAssets: Asset[]
  interestAssets: Asset[]
  debtCount: number
  interestCount: number
  collectionAddress: string
  duration: bigint
  deadline: bigint
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      CollectionLendOffer: [
        { name: 'lender', type: 'ContractAddress' },
        { name: 'debt_hash', type: 'felt' },
        { name: 'interest_hash', type: 'felt' },
        { name: 'debt_count', type: 'u128' },
        { name: 'interest_count', type: 'u128' },
        { name: 'collection_address', type: 'ContractAddress' },
        { name: 'duration', type: 'u128' },
        { name: 'deadline', type: 'u128' },
        { name: 'nonce', type: 'felt' },
      ],
    },
    primaryType: 'CollectionLendOffer',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      lender: params.lender,
      debt_hash: hashAssets(params.debtAssets),
      interest_hash: hashAssets(params.interestAssets),
      debt_count: params.debtCount.toString(),
      interest_count: params.interestCount.toString(),
      collection_address: params.collectionAddress,
      duration: params.duration.toString(),
      deadline: params.deadline.toString(),
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a borrower's collection borrow acceptance (T1-2).
 * The borrower specifies which token_id from the collection to use as collateral.
 */
export function getCollectionBorrowAcceptanceTypedData(params: {
  offerHash: string
  borrower: string
  tokenId: bigint
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      CollectionBorrowAcceptance: [
        { name: 'offer_hash', type: 'felt' },
        { name: 'borrower', type: 'ContractAddress' },
        { name: 'token_id', type: 'u256' },
        { name: 'nonce', type: 'felt' },
      ],
      u256: U256_TYPE,
    },
    primaryType: 'CollectionBorrowAcceptance',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      offer_hash: params.offerHash,
      borrower: params.borrower,
      token_id: u256Message(params.tokenId),
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a renegotiation proposal (T1-4).
 * Either borrower or lender proposes new terms for an existing loan.
 */
export function getRenegotiationProposalTypedData(params: {
  inscriptionId: bigint
  proposer: string
  newDuration: bigint
  newInterestAssets: Asset[]
  newInterestCount: number
  proposalDeadline: bigint
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      RenegotiationProposal: [
        { name: 'inscription_id', type: 'u256' },
        { name: 'proposer', type: 'ContractAddress' },
        { name: 'new_duration', type: 'u128' },
        { name: 'new_interest_hash', type: 'felt' },
        { name: 'new_interest_count', type: 'u128' },
        { name: 'proposal_deadline', type: 'u128' },
        { name: 'nonce', type: 'felt' },
      ],
      u256: U256_TYPE,
    },
    primaryType: 'RenegotiationProposal',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      inscription_id: u256Message(params.inscriptionId),
      proposer: params.proposer,
      new_duration: params.newDuration.toString(),
      new_interest_hash: hashAssets(params.newInterestAssets),
      new_interest_count: params.newInterestCount.toString(),
      proposal_deadline: params.proposalDeadline.toString(),
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a collateral sale offer (T1-5).
 * The borrower offers to sell locked collateral to repay the loan.
 */
export function getCollateralSaleOfferTypedData(params: {
  inscriptionId: bigint
  borrower: string
  minPrice: bigint
  paymentToken: string
  allowedBuyer: string
  deadline: bigint
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      CollateralSaleOffer: [
        { name: 'inscription_id', type: 'u256' },
        { name: 'borrower', type: 'ContractAddress' },
        { name: 'min_price', type: 'u256' },
        { name: 'payment_token', type: 'ContractAddress' },
        { name: 'allowed_buyer', type: 'ContractAddress' },
        { name: 'deadline', type: 'u128' },
        { name: 'nonce', type: 'felt' },
      ],
      u256: U256_TYPE,
    },
    primaryType: 'CollateralSaleOffer',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      inscription_id: u256Message(params.inscriptionId),
      borrower: params.borrower,
      min_price: u256Message(params.minPrice),
      payment_token: params.paymentToken,
      allowed_buyer: params.allowedBuyer,
      deadline: params.deadline.toString(),
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a refinance offer (T1-1).
 * A new lender offers to take over an existing loan with new terms.
 */
export function getRefinanceOfferTypedData(params: {
  inscriptionId: bigint
  newLender: string
  newDebtAssets: Asset[]
  newInterestAssets: Asset[]
  newDebtCount: number
  newInterestCount: number
  newDuration: bigint
  deadline: bigint
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      RefinanceOffer: [
        { name: 'inscription_id', type: 'u256' },
        { name: 'new_lender', type: 'ContractAddress' },
        { name: 'new_debt_hash', type: 'felt' },
        { name: 'new_interest_hash', type: 'felt' },
        { name: 'new_debt_count', type: 'u128' },
        { name: 'new_interest_count', type: 'u128' },
        { name: 'new_duration', type: 'u128' },
        { name: 'deadline', type: 'u128' },
        { name: 'nonce', type: 'felt' },
      ],
      u256: U256_TYPE,
    },
    primaryType: 'RefinanceOffer',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      inscription_id: u256Message(params.inscriptionId),
      new_lender: params.newLender,
      new_debt_hash: hashAssets(params.newDebtAssets),
      new_interest_hash: hashAssets(params.newInterestAssets),
      new_debt_count: params.newDebtCount.toString(),
      new_interest_count: params.newInterestCount.toString(),
      new_duration: params.newDuration.toString(),
      deadline: params.deadline.toString(),
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a refinance approval (T1-1).
 * The borrower approves a specific refinance offer for their loan.
 */
export function getRefinanceApprovalTypedData(params: {
  inscriptionId: bigint
  offerHash: string
  borrower: string
  nonce: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      RefinanceApproval: [
        { name: 'inscription_id', type: 'u256' },
        { name: 'offer_hash', type: 'felt' },
        { name: 'borrower', type: 'ContractAddress' },
        { name: 'nonce', type: 'felt' },
      ],
      u256: U256_TYPE,
    },
    primaryType: 'RefinanceApproval',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      inscription_id: u256Message(params.inscriptionId),
      offer_hash: params.offerHash,
      borrower: params.borrower,
      nonce: params.nonce.toString(),
    },
  }
}

/**
 * Build SNIP-12 TypedData for a terms-of-use acknowledgment.
 * The user signs this off-chain to prove they accepted the protocol terms.
 * NOT verified on-chain — stored off-chain as proof of consent.
 */
export function getTermsAcknowledgmentTypedData(params: {
  user: string
  termsVersion: string
  termsHash: string
  agreedAt: bigint
  chainId: string
}): TypedData {
  return {
    types: {
      StarknetDomain: STARKNET_DOMAIN_TYPE,
      TermsAcknowledgment: [
        { name: 'user', type: 'ContractAddress' },
        { name: 'terms_version', type: 'shortstring' },
        { name: 'terms_hash', type: 'felt' },
        { name: 'agreed_at', type: 'u128' },
      ],
    },
    primaryType: 'TermsAcknowledgment',
    domain: { ...STELA_DOMAIN, chainId: params.chainId },
    message: {
      user: params.user,
      terms_version: params.termsVersion,
      terms_hash: params.termsHash,
      agreed_at: params.agreedAt.toString(),
    },
  }
}
