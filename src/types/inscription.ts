import type { AssetType, InscriptionStatus } from './common.js'

/** An asset within an inscription (matches the Cairo Asset struct) */
export interface Asset {
  /** Contract address of the token */
  asset_address: string
  /** Token standard */
  asset_type: AssetType
  /** Token amount (ERC20/ERC1155/ERC4626) */
  value: bigint
  /** Token ID (ERC721/ERC1155) */
  token_id: bigint
}

/** Parameters for creating a new inscription (matches Cairo InscriptionParams) */
export interface InscriptionParams {
  is_borrow: boolean
  debt_assets: Asset[]
  interest_assets: Asset[]
  collateral_assets: Asset[]
  /** Duration in seconds */
  duration: bigint
  /** Deadline as unix timestamp (seconds) */
  deadline: bigint
  multi_lender: boolean
}

/** Raw inscription data as stored on-chain (matches Cairo StoredInscription) */
export interface StoredInscription {
  borrower: string
  lender: string
  duration: bigint
  deadline: bigint
  signed_at: bigint
  issued_debt_percentage: bigint
  is_repaid: boolean
  liquidated: boolean
  multi_lender: boolean
  debt_asset_count: number
  interest_asset_count: number
  collateral_asset_count: number
}

/** Parsed inscription with computed status and ID */
export interface Inscription extends StoredInscription {
  id: string
  status: InscriptionStatus
}

/** Signed order for the matching engine (matches Cairo SignedOrder struct) */
export interface SignedOrder {
  /** Order creator (could be borrower or lender) */
  maker: string
  /** Zero address = open to anyone; nonzero = private OTC (only this address can fill) */
  allowed_taker: string
  /** The inscription being offered for filling */
  inscription_id: bigint
  /** Fill percentage being offered (in BPS, max 10,000) */
  bps: bigint
  /** Unix timestamp deadline for order expiration */
  deadline: bigint
  /** Maker nonce; bump via cancel_orders_by_nonce to invalidate batch */
  nonce: string
  /** Minimum acceptable partial fill (0 = any amount accepted) */
  min_fill_bps: bigint
}
