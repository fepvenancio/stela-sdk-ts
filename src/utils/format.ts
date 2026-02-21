/** Format duration in seconds to human-readable (e.g. "7d 0h", "2h", "30m") */
export function formatDuration(seconds: number | bigint): string {
  const s = Number(seconds)
  if (s < 3600) return `${Math.floor(s / 60)}m`
  const h = Math.floor(s / 3600)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h`
}

/** Format a unix timestamp (seconds) to locale string */
export function formatTimestamp(ts: bigint): string {
  if (ts === 0n) return '--'
  return new Date(Number(ts) * 1000).toLocaleString()
}
