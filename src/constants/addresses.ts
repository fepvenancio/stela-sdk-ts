import type { Network } from '../types/common.js'

/** Deployed Stela protocol contract addresses per network */
export const STELA_ADDRESS: Record<Network, string> = {
  sepolia: '0x031f738a405157f85e1f20156f3301d15cdaae363d302f4e1f44c49dbc83d437',
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
