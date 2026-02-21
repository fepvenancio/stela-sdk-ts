import { uint256 } from 'starknet'

const U128_MAX = (1n << 128n) - 1n
const U256_MAX = (1n << 256n) - 1n

/** Convert a bigint to a [low, high] calldata pair for StarkNet u256 */
export const toU256 = (n: bigint): [string, string] => {
  if (n < 0n || n > U256_MAX) throw new RangeError(`Value out of u256 range: ${n}`)
  const { low, high } = uint256.bnToUint256(n)
  return [low.toString(), high.toString()]
}

/** Convert a { low, high } u256 pair back to a bigint */
export const fromU256 = (u: { low: bigint; high: bigint }): bigint => {
  if (u.low < 0n || u.low > U128_MAX || u.high < 0n || u.high > U128_MAX) {
    throw new RangeError('Invalid u256 component: low and high must be u128')
  }
  return uint256.uint256ToBN(u)
}

/** Convert a u256 { low, high } to a 0x-prefixed 64-char hex string (for DB keys) */
export const inscriptionIdToHex = (u: { low: bigint; high: bigint }): string =>
  '0x' + fromU256(u).toString(16).padStart(64, '0')
