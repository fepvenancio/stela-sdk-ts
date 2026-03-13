import type { Network } from '../types/common.js'

export interface TokenInfo {
  symbol: string
  name: string
  decimals: number
  addresses: Partial<Record<Network, string>>
  logoUrl?: string
  /** Asset type — defaults to ERC20 if omitted */
  assetType?: 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC4626'
}
