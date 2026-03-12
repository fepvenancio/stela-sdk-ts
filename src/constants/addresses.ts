import type { Network } from '../types/common.js'

/** Deployed Stela protocol contract addresses per network */
export const STELA_ADDRESS: Record<Network, string> = {
  sepolia: '0x0109c6caae0c5b4da6e063ed6c02ae784be05aa90806501a48dcfbb213bd7c03',
  mainnet: '0x0',
} as const

const VALID_NETWORKS: Network[] = ['sepolia', 'mainnet']

/** Validate and return a Network value, defaulting to 'sepolia' */
export function resolveNetwork(raw?: string): Network {
  const trimmed = raw?.trim()
  if (trimmed && VALID_NETWORKS.includes(trimmed as Network)) return trimmed as Network
  if (trimmed) console.warn(`Invalid NETWORK "${trimmed}", falling back to sepolia`)
  return 'sepolia'
}

/** SNIP-12 chain ID shortstrings per network */
export const CHAIN_ID: Record<Network, string> = {
  sepolia: 'SN_SEPOLIA',
  mainnet: 'SN_MAIN',
} as const

/** Block explorer base URLs per network (for transaction links) */
export const EXPLORER_TX_URL: Record<Network, string> = {
  sepolia: 'https://sepolia.voyager.online/tx',
  mainnet: 'https://voyager.online/tx',
} as const
