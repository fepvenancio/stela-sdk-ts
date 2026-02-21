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
