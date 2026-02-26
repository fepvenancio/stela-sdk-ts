import { hash } from 'starknet'
import type { Asset } from '../types/inscription.js'
import { ASSET_TYPE_ENUM } from '../constants/protocol.js'
import { toU256 } from '../utils/u256.js'

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
