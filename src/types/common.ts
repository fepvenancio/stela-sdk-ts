/** Supported StarkNet networks */
export type Network = 'sepolia' | 'mainnet'

/** Token standard types supported by the Stela protocol */
export type AssetType = 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC4626'

/** Possible states of an inscription */
export type InscriptionStatus =
  | 'open'
  | 'partial'
  | 'filled'
  | 'repaid'
  | 'liquidated'
  | 'expired'
  | 'cancelled'

/** All valid inscription statuses as an array */
export const VALID_STATUSES: readonly InscriptionStatus[] = [
  'open',
  'partial',
  'filled',
  'repaid',
  'liquidated',
  'expired',
  'cancelled',
] as const

/** Human-readable labels for each inscription status */
export const STATUS_LABELS: Record<InscriptionStatus, string> = {
  open: 'Open',
  partial: 'Partial',
  filled: 'Filled',
  repaid: 'Repaid',
  liquidated: 'Liquidated',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

/** A single StarkNet call (matches starknet.js Call type) */
export interface Call {
  contractAddress: string
  entrypoint: string
  calldata: string[]
}
