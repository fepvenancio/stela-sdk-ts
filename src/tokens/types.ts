import type { Network } from '../types/common.js'

export interface TokenInfo {
  symbol: string
  name: string
  decimals: number
  addresses: Partial<Record<Network, string>>
  logoUrl?: string
}
