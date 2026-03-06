import { hash } from 'starknet'
import type { Asset } from '../types/inscription.js'
import { ASSET_TYPE_ENUM } from '../constants/protocol.js'
import { toU256 } from '../utils/u256.js'

/** Matches Cairo's U256_TYPE_HASH = selector!("\"u256\"(\"low\":\"u128\",\"high\":\"u128\")") */
const U256_TYPE_HASH = '0x3b143be38b811560b45593fb2a071ec4ddd0a020e10782be62ffe6f39e0e82c'

export interface BatchEntry {
  orderHash: string // felt252 hex
  bps: bigint       // u256
}

/**
 * Hash an array of BatchEntry using Poseidon -- matches Cairo's hash_batch_entries().
 *
 * Format: Poseidon(count, order_hash_1, u256_hash(bps_1), order_hash_2, u256_hash(bps_2), ...)
 * where u256_hash(bps) = Poseidon(U256_TYPE_HASH, low, high)
 */
export function hashBatchEntries(entries: BatchEntry[]): string {
  const elements: string[] = [String(entries.length)]
  for (const entry of entries) {
    elements.push(entry.orderHash)
    const [low, high] = toU256(entry.bps)
    const bpsHash = hash.computePoseidonHashOnElements([U256_TYPE_HASH, low, high])
    elements.push(bpsHash)
  }
  return hash.computePoseidonHashOnElements(elements)
}

/**
 * Hash an array of assets using Poseidon -- matches Cairo's hash_assets().
 *
 * The Cairo code hashes: len, then for each asset:
 *   asset.asset        (ContractAddress -> 1 felt)
 *   asset.asset_type   (enum -> 1 felt)
 *   asset.value         (u256 -> low felt, high felt)
 *   asset.token_id      (u256 -> low felt, high felt)
 *
 * Uses `hash.computePoseidonHashOnElements` from starknet.js which takes an
 * array and computes Poseidon over all elements.
 */
export function hashAssets(assets: Asset[]): string {
  const elements: string[] = [String(assets.length)]
  for (const asset of assets) {
    elements.push(asset.asset_address)
    elements.push(String(ASSET_TYPE_ENUM[asset.asset_type]))
    const [vLow, vHigh] = toU256(asset.value)
    elements.push(vLow, vHigh)
    const [tidLow, tidHigh] = toU256(asset.token_id)
    elements.push(tidLow, tidHigh)
  }
  return hash.computePoseidonHashOnElements(elements)
}
