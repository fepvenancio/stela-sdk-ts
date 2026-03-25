/**
 * Calldata serialization/deserialization for StarkNet transactions.
 *
 * Used by the indexer (parsing tx calldata) and settlement bot
 * (building calldata for create_inscription / settle / batch_settle).
 */

import type { AssetType } from '../types/common.js'
import { ASSET_TYPE_ENUM, ASSET_TYPE_NAMES } from '../constants/protocol.js'
import { toU256, fromU256 } from './u256.js'
import { normalizeAddress } from './address.js'

/** Asset shape used in calldata serialization (string values, not bigint) */
export interface StoredAsset {
  asset_address: string
  asset_type: AssetType
  value: string
  token_id: string
}

/** Serialize an asset array into calldata: [len, ...per-asset fields] */
export function serializeAssetCalldata(assets: StoredAsset[]): string[] {
  const calldata: string[] = [String(assets.length)]
  for (const asset of assets) {
    const enumVal = ASSET_TYPE_ENUM[asset.asset_type] ?? 0
    const [valueLow, valueHigh] = toU256(BigInt(asset.value))
    const [tokenIdLow, tokenIdHigh] = toU256(BigInt(asset.token_id))
    calldata.push(
      normalizeAddress(asset.asset_address),
      String(enumVal),
      valueLow,
      valueHigh,
      tokenIdLow,
      tokenIdHigh,
    )
  }
  return calldata
}

/** Parse an asset array from raw RPC calldata */
export function parseAssetArray(
  calldata: string[],
  offset: number,
): { assets: StoredAsset[]; nextOffset: number } {
  const count = Number(BigInt(calldata[offset]))
  let pos = offset + 1
  const assets: StoredAsset[] = []

  for (let i = 0; i < count; i++) {
    const address = normalizeAddress(calldata[pos])
    const typeEnum = Number(BigInt(calldata[pos + 1]))
    const valueLow = BigInt(calldata[pos + 2])
    const valueHigh = BigInt(calldata[pos + 3])
    const tokenIdLow = BigInt(calldata[pos + 4])
    const tokenIdHigh = BigInt(calldata[pos + 5])

    assets.push({
      asset_address: address,
      asset_type: ASSET_TYPE_NAMES[typeEnum] ?? ('unknown' as AssetType),
      value: fromU256({ low: valueLow, high: valueHigh }).toString(),
      token_id: fromU256({ low: tokenIdLow, high: tokenIdHigh }).toString(),
    })
    pos += 6
  }

  return { assets, nextOffset: pos }
}

/** Serialize a signature string "r,s" or JSON [r, s] into calldata: [len, ...parts] */
export function serializeSignatureCalldata(sig: string): string[] {
  let parts: string[]
  if (sig.startsWith('[')) {
    parts = JSON.parse(sig) as string[]
  } else if (sig.startsWith('{')) {
    const obj = JSON.parse(sig) as { r: string; s: string }
    parts = [obj.r, obj.s]
  } else {
    parts = sig.split(',')
  }
  return [String(parts.length), ...parts]
}

/** Standardize a hex string to 0x-prefixed lowercase */
function standardizeHex(hex: string): string {
  const clean = hex.toLowerCase().replace(/^0x/, '')
  return '0x' + clean
}

// Computed via starknet.js hash.getSelectorFromName()
const CREATE_INSCRIPTION_SELECTOR = '0x1883531093e6399258a46b3e397a8ec94952f12d37afeeea49fb35b4361d262'
const SETTLE_SELECTOR = '0x1482408710165f49db4f7b422428870c37d86b0624cd661b387e24aa64f0249'
const BATCH_SETTLE_SELECTOR = '0x116475a69261425e56d6d49661fec19f7629381447afd9c70300115e6f44d0f'

type MatchedCall = { selector: string; cd: string[] }

/** Find matching call in multicall or direct transaction calldata */
function findCall(calldata: string[], selectors: string[]): MatchedCall | null {
  const numCalls = Number(BigInt(calldata[0]))

  if (numCalls > 0 && numCalls < 100) {
    // Multicall: [num_calls, to, selector, data_len, ...data, ...]
    let pos = 1
    for (let i = 0; i < numCalls; i++) {
      const selector = standardizeHex(calldata[pos + 1])
      const cdLen = Number(BigInt(calldata[pos + 2]))
      const cdStart = pos + 3
      if (selectors.includes(selector)) {
        return { selector, cd: calldata.slice(cdStart, cdStart + cdLen) }
      }
      pos = cdStart + cdLen
    }
  }

  return null
}

/** Extract and parse inscription assets from transaction calldata */
export function parseInscriptionCalldata(calldata: string[]): {
  debt: StoredAsset[]
  interest: StoredAsset[]
  collateral: StoredAsset[]
} | null {
  try {
    const match = findCall(calldata, [CREATE_INSCRIPTION_SELECTOR, SETTLE_SELECTOR, BATCH_SETTLE_SELECTOR])
    if (!match) return null

    let offset: number
    if (match.selector === CREATE_INSCRIPTION_SELECTOR) {
      // create_inscription(InscriptionParams): is_borrow(1), debt_assets, interest_assets, collateral_assets, ...
      offset = 1
    } else if (match.selector === SETTLE_SELECTOR) {
      // settle(InscriptionOrder(11), debt_assets, interest_assets, collateral_assets, ...)
      offset = 11
    } else {
      // batch_settle: orders array length + N orders, then flat asset arrays
      // Too complex for single-inscription parsing — skip for now
      return null
    }

    const { assets: debt, nextOffset: afterDebt } = parseAssetArray(match.cd, offset)
    const { assets: interest, nextOffset: afterInterest } = parseAssetArray(match.cd, afterDebt)
    const { assets: collateral } = parseAssetArray(match.cd, afterInterest)

    return { debt, interest, collateral }
  } catch {
    return null
  }
}
