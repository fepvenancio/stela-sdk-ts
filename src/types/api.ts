/** Row shape returned by the /api/inscriptions list endpoint */
export interface InscriptionRow {
  id: string
  creator: string
  borrower: string | null
  lender: string | null
  status: string
  issued_debt_percentage: string
  multi_lender: boolean
  duration: string
  deadline: string
  signed_at: string | null
  debt_asset_count: number
  interest_asset_count: number
  collateral_asset_count: number
  created_at_ts: string
  assets: AssetRow[]
}

/** Asset row shape from the inscription_assets table */
export interface AssetRow {
  inscription_id: string
  asset_role: 'debt' | 'interest' | 'collateral'
  asset_index: number
  asset_address: string
  asset_type: string
  value: string | null
  token_id: string | null
}

/** Standard API response envelope for list endpoints */
export interface ApiListResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}

/** Standard API response envelope for detail endpoints */
export interface ApiDetailResponse<T> {
  data: T
}

/** Treasury asset balance info */
export interface TreasuryAsset {
  asset_address: string
  asset_type: string
  balance: string
}

/** ERC1155 share balance for a lender on an inscription */
export interface ShareBalance {
  inscription_id: string
  holder: string
  balance: string
}

/** Locker account info for an inscription */
export interface LockerInfo {
  inscription_id: string
  locker_address: string
  is_unlocked: boolean
}
