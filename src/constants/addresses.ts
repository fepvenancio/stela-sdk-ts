import type { Network } from '../types/common.js'

/** Deployed Stela protocol contract addresses per network */
export const STELA_ADDRESS: Record<Network, string> = {
  sepolia: '0x042e955a1905261e7afdba17518506c8f275759e1195bc19e2eca908658bf8e9',
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
