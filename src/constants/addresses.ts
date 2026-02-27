import type { Network } from '../types/common.js'

/** Deployed Stela protocol contract addresses per network */
export const STELA_ADDRESS: Record<Network, string> = {
  sepolia: '0x00c667d12113011a05f6271cc4bd9e7f4c3c5b90a093708801955af5a5b1e6d5',
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
