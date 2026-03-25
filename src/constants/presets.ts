/**
 * Trade UI presets for deadlines and durations.
 *
 * Shared between frontend (form dropdowns) and backend (validation bounds).
 * Does NOT import any framework-specific code.
 */

export interface DeadlinePreset {
  label: string
  seconds: number
}

export interface DurationPreset {
  label: string
  seconds: number
}

/** Short-lived deadline options used on the Swap form. */
export const SWAP_DEADLINE_PRESETS: DeadlinePreset[] = [
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
  { label: '12h', seconds: 43200 },
  { label: '1d', seconds: 86400 },
  { label: '7d', seconds: 604800 },
  { label: '30d', seconds: 2592000 },
]

/** Longer-lived deadline options used on the Lend / Borrow form. */
export const LEND_DEADLINE_PRESETS: DeadlinePreset[] = [
  { label: '7d', seconds: 604800 },
  { label: '14d', seconds: 1209600 },
  { label: '30d', seconds: 2592000 },
  { label: '60d', seconds: 5184000 },
  { label: '90d', seconds: 7776000 },
]

/** Loan duration options (how long the borrower has to repay). */
export const DURATION_PRESETS: DurationPreset[] = [
  { label: '1d', seconds: 86400 },
  { label: '7d', seconds: 604800 },
  { label: '14d', seconds: 1209600 },
  { label: '30d', seconds: 2592000 },
  { label: '90d', seconds: 7776000 },
  { label: '180d', seconds: 15552000 },
  { label: '1y', seconds: 31536000 },
]

/**
 * Convert a duration in seconds to a short human-readable string.
 *
 * @example
 * formatDurationHuman(300)       // "5 min"
 * formatDurationHuman(7200)      // "2 hours"
 * formatDurationHuman(86400)     // "1 day"
 * formatDurationHuman(604800)    // "7 days"
 */
export function formatDurationHuman(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
  const days = Math.round(seconds / 86400)
  return `${days} day${days !== 1 ? 's' : ''}`
}
