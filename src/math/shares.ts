import { MAX_BPS, VIRTUAL_SHARE_OFFSET } from '../constants/protocol.js'

/** Convert a fill percentage to shares, matching the contract's share math */
export function convertToShares(
  percentage: bigint,
  totalSupply: bigint,
  currentIssuedPercentage: bigint,
): bigint {
  const denominator = currentIssuedPercentage === 0n ? 1n : currentIssuedPercentage
  return (percentage * (totalSupply + VIRTUAL_SHARE_OFFSET)) / denominator
}

/** Scale a value by a percentage in basis points */
export function scaleByPercentage(value: bigint, percentage: bigint): bigint {
  return (value * percentage) / MAX_BPS
}

/** Convert shares back to a percentage of the inscription */
export function sharesToPercentage(
  shares: bigint,
  totalSupply: bigint,
  currentIssuedPercentage: bigint,
): bigint {
  const effectivePct = currentIssuedPercentage === 0n ? 1n : currentIssuedPercentage
  return (shares * effectivePct) / (totalSupply + VIRTUAL_SHARE_OFFSET)
}

/** Calculate the fee portion of shares given a fee in basis points */
export function calculateFeeShares(shares: bigint, feeBps: bigint): bigint {
  return (shares * feeBps) / MAX_BPS
}

/** Ceiling integer division: ceil(a / b). Matches Cairo div_ceil. */
export function divCeil(a: bigint, b: bigint): bigint {
  if (a === 0n) return 0n
  return (a + b - 1n) / b
}

/**
 * Pro-rata interest for early repayment. Matches Cairo pro_rata_interest().
 * Rounds UP (ceiling) to protect lenders — borrower never underpays.
 *
 * @param amount - Full interest amount
 * @param elapsed - Seconds elapsed since loan signed
 * @param duration - Total loan duration in seconds
 * @returns ceil(amount * elapsed / duration), capped at amount
 */
export function proRataInterest(amount: bigint, elapsed: bigint, duration: bigint): bigint {
  if (amount === 0n || elapsed === 0n) return 0n
  if (elapsed >= duration) return amount
  return divCeil(amount * elapsed, duration)
}
