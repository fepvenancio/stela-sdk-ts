import type { AssetType } from '../types/common.js'

/** Maximum basis points (100%) */
export const MAX_BPS = 10_000n

/** Virtual share offset used in share calculations (1e16) */
export const VIRTUAL_SHARE_OFFSET = 10_000_000_000_000_000n

/** Numeric enum values for asset types (matches Cairo contract) */
export const ASSET_TYPE_ENUM: Record<AssetType, number> = {
  ERC20: 0,
  ERC721: 1,
  ERC1155: 2,
  ERC4626: 3,
}

/** Reverse mapping: numeric enum value to AssetType name */
export const ASSET_TYPE_NAMES: Record<number, AssetType> = {
  0: 'ERC20',
  1: 'ERC721',
  2: 'ERC1155',
  3: 'ERC4626',
}
