import type { Account, TypedData, WeierstrassSignatureType } from 'starknet'
import { TypedDataRevision } from 'starknet'
import type { SignedOrder } from '../types/matching.js'

/**
 * Split a decimal string representing a u256 value into low/high u128 parts.
 * Returns hex strings prefixed with `0x`.
 */
export function splitU256(value: string): { low: string; high: string } {
  const n = BigInt(value)
  const mask128 = (1n << 128n) - 1n
  const low = n & mask128
  const high = n >> 128n
  return {
    low: '0x' + low.toString(16),
    high: '0x' + high.toString(16),
  }
}

/**
 * Build the SNIP-12 TypedData object for signing a maker order.
 *
 * Uses TypedDataRevision.ACTIVE (revision 1) with `StarknetDomain` type name
 * to match the Cairo OpenZeppelin SNIP-12 implementation.
 */
export function buildSignedOrderTypedData(
  order: SignedOrder,
  chainId: string,
  contractAddress: string,
): TypedData {
  const inscriptionId = splitU256(order.inscription_id)
  const bps = splitU256(order.bps)
  const minFillBps = splitU256(order.min_fill_bps)

  return {
    primaryType: 'SignedOrder',
    domain: {
      name: 'Stela',
      chainId,
      version: '1',
      revision: TypedDataRevision.ACTIVE,
    },
    types: {
      StarknetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
      ],
      SignedOrder: [
        { name: 'maker', type: 'ContractAddress' },
        { name: 'allowed_taker', type: 'ContractAddress' },
        { name: 'inscription_id', type: 'u256' },
        { name: 'bps', type: 'u256' },
        { name: 'deadline', type: 'felt' },
        { name: 'nonce', type: 'felt' },
        { name: 'min_fill_bps', type: 'u256' },
      ],
      u256: [
        { name: 'low', type: 'u128' },
        { name: 'high', type: 'u128' },
      ],
    },
    message: {
      maker: order.maker,
      allowed_taker: order.allowed_taker,
      inscription_id: inscriptionId,
      bps,
      deadline: order.deadline,
      nonce: order.nonce,
      min_fill_bps: minFillBps,
    },
  }
}

/**
 * Sign a maker order using the connected StarkNet account.
 *
 * @returns The ECDSA signature as [r, s] hex strings.
 */
export async function signOrder(
  account: Account,
  order: SignedOrder,
  chainId: string,
  contractAddress: string,
): Promise<[string, string]> {
  const typedData = buildSignedOrderTypedData(order, chainId, contractAddress)
  const result = await account.signMessage(typedData)
  const sig = result as WeierstrassSignatureType
  return [sig.r.toString(16), sig.s.toString(16)]
}
