import { MAX_BPS } from '../constants/protocol.js'
import { proRataInterest, divCeil } from './shares.js'
import type { Asset } from '../types/inscription.js'

/** Default dust buffer: 60 seconds of extra interest accrual to account for tx confirmation delay */
export const DEFAULT_DUST_BUFFER_SECONDS = 60n

/** Value breakdown for a single asset in a position */
export interface AssetValue {
  /** The asset definition */
  asset: Asset
  /** The share-proportional amount of this asset */
  proportionalValue: bigint
}

/** Accrued interest for a single asset in a position */
export interface AccruedInterestEntry {
  /** The interest asset definition */
  asset: Asset
  /** Full interest amount (before pro-rata) scaled to share proportion */
  fullInterest: bigint
  /** Pro-rata accrued interest at the given elapsed time */
  accruedInterest: bigint
}

/** Complete position valuation at a point in time */
export interface PositionValue {
  /** Inscription ID */
  inscriptionId: string
  /** Shares held */
  shares: bigint
  /** Total supply of shares for this inscription */
  totalSupply: bigint
  /** Share proportion as a fraction of MAX_BPS (10000) */
  shareBps: bigint
  /** Debt asset values (proportional to shares held) */
  debt: AssetValue[]
  /** Interest asset values (full and accrued) */
  interest: AccruedInterestEntry[]
  /** Collateral asset values (proportional to shares held) */
  collateral: AssetValue[]
  /** Suggested floor price: sum of proportional debt + accrued interest (per asset) */
  accrued: AccruedInterestEntry[]
  /** Elapsed seconds since loan signed */
  elapsed: bigint
  /** Total loan duration */
  duration: bigint
}

/**
 * Compute the share proportion in BPS for a given share amount.
 * Returns how many basis points (out of 10000) the shares represent.
 */
export function shareProportionBps(shares: bigint, totalSupply: bigint): bigint {
  if (totalSupply === 0n) return 0n
  return (shares * MAX_BPS) / totalSupply
}

/**
 * Compute the proportional value of an asset for a given share amount.
 * This is the amount the share holder would receive on redemption.
 *
 * Matches the contract: `tracked_balance * shares / total_supply`
 */
export function proportionalAssetValue(
  assetValue: bigint,
  shares: bigint,
  totalSupply: bigint,
): bigint {
  if (totalSupply === 0n || shares === 0n) return 0n
  return (assetValue * shares) / totalSupply
}

/**
 * Compute the full position valuation at a point in time.
 *
 * @param params.inscriptionId - The inscription ID
 * @param params.shares - Shares held by the position owner
 * @param params.totalSupply - Total shares for this inscription
 * @param params.debtAssets - Debt asset definitions with values
 * @param params.interestAssets - Interest asset definitions with values
 * @param params.collateralAssets - Collateral asset definitions with values
 * @param params.elapsed - Seconds elapsed since signed_at
 * @param params.duration - Total loan duration in seconds
 */
export function computePositionValue(params: {
  inscriptionId: string
  shares: bigint
  totalSupply: bigint
  debtAssets: Asset[]
  interestAssets: Asset[]
  collateralAssets: Asset[]
  elapsed: bigint
  duration: bigint
}): PositionValue {
  const { shares, totalSupply, elapsed, duration } = params

  const shareBps = shareProportionBps(shares, totalSupply)

  const debt: AssetValue[] = params.debtAssets.map((asset) => ({
    asset,
    proportionalValue: proportionalAssetValue(asset.value, shares, totalSupply),
  }))

  const interest: AccruedInterestEntry[] = params.interestAssets.map((asset) => {
    const fullInterest = proportionalAssetValue(asset.value, shares, totalSupply)
    const accruedInterest =
      duration === 0n ? fullInterest : proRataInterest(fullInterest, elapsed, duration)
    return { asset, fullInterest, accruedInterest }
  })

  const collateral: AssetValue[] = params.collateralAssets.map((asset) => ({
    asset,
    proportionalValue: proportionalAssetValue(asset.value, shares, totalSupply),
  }))

  return {
    inscriptionId: params.inscriptionId,
    shares,
    totalSupply,
    shareBps,
    debt,
    interest,
    collateral,
    accrued: interest,
    elapsed,
    duration,
  }
}

/**
 * Compute accrued interest with a dust buffer to account for transaction confirmation delay.
 *
 * Between computing the price and the transaction landing on-chain, interest continues
 * to accrue. This adds a configurable buffer (default 60s) of extra interest so the
 * buyer's approval doesn't fail due to a tiny increase.
 *
 * @param amount - Full interest amount for the position
 * @param elapsed - Current elapsed seconds since signed_at
 * @param duration - Total loan duration in seconds
 * @param bufferSeconds - Extra seconds to add (default: 60)
 * @returns Accrued interest at (elapsed + buffer), capped at full amount
 */
export function accruedInterestWithBuffer(
  amount: bigint,
  elapsed: bigint,
  duration: bigint,
  bufferSeconds: bigint = DEFAULT_DUST_BUFFER_SECONDS,
): bigint {
  if (duration === 0n) return amount
  const bufferedElapsed = elapsed + bufferSeconds
  return proRataInterest(amount, bufferedElapsed, duration)
}

/**
 * Compute a safe minimum price for buying a lending position.
 * Includes proportional debt + accrued interest + dust buffer for each interest asset.
 *
 * Use this when the buyer needs to know how much to approve for payment tokens.
 *
 * @returns Array of { asset, safeAmount } for debt assets and interest assets respectively
 */
export function computeSafePositionFloor(params: {
  shares: bigint
  totalSupply: bigint
  debtAssets: Asset[]
  interestAssets: Asset[]
  elapsed: bigint
  duration: bigint
  bufferSeconds?: bigint
}): { debtFloor: AssetValue[]; interestFloor: AssetValue[] } {
  const { shares, totalSupply, elapsed, duration } = params
  const buffer = params.bufferSeconds ?? DEFAULT_DUST_BUFFER_SECONDS

  const debtFloor: AssetValue[] = params.debtAssets.map((asset) => ({
    asset,
    proportionalValue: proportionalAssetValue(asset.value, shares, totalSupply),
  }))

  const interestFloor: AssetValue[] = params.interestAssets.map((asset) => {
    const fullInterest = proportionalAssetValue(asset.value, shares, totalSupply)
    const safeAccrued = accruedInterestWithBuffer(fullInterest, elapsed, duration, buffer)
    return { asset, proportionalValue: safeAccrued }
  })

  return { debtFloor, interestFloor }
}
