import { describe, it, expect } from 'vitest'
import {
  VALID_STATUSES,
  STATUS_LABELS,
  STELA_ADDRESS,
  resolveNetwork,
  MAX_BPS,
  VIRTUAL_SHARE_OFFSET,
  ASSET_TYPE_ENUM,
  ASSET_TYPE_NAMES,
} from '../src/index.js'

describe('constants', () => {
  it('VALID_STATUSES has 7 entries', () => {
    expect(VALID_STATUSES).toHaveLength(7)
  })

  it('STATUS_LABELS covers all statuses', () => {
    for (const status of VALID_STATUSES) {
      expect(STATUS_LABELS[status]).toBeDefined()
      expect(typeof STATUS_LABELS[status]).toBe('string')
    }
  })

  it('STELA_ADDRESS has sepolia and mainnet', () => {
    expect(STELA_ADDRESS.sepolia).toBeDefined()
    expect(STELA_ADDRESS.mainnet).toBeDefined()
    expect(STELA_ADDRESS.sepolia.startsWith('0x')).toBe(true)
  })

  it('resolveNetwork defaults to sepolia', () => {
    expect(resolveNetwork()).toBe('sepolia')
    expect(resolveNetwork('')).toBe('sepolia')
    expect(resolveNetwork('invalid')).toBe('sepolia')
  })

  it('resolveNetwork accepts valid networks', () => {
    expect(resolveNetwork('sepolia')).toBe('sepolia')
    expect(resolveNetwork('mainnet')).toBe('mainnet')
  })

  it('MAX_BPS equals 10000n', () => {
    expect(MAX_BPS).toBe(10_000n)
  })

  it('VIRTUAL_SHARE_OFFSET equals 1e16', () => {
    expect(VIRTUAL_SHARE_OFFSET).toBe(10_000_000_000_000_000n)
  })

  it('ASSET_TYPE_ENUM and ASSET_TYPE_NAMES are consistent', () => {
    for (const [name, value] of Object.entries(ASSET_TYPE_ENUM)) {
      expect(ASSET_TYPE_NAMES[value]).toBe(name)
    }
  })
})
