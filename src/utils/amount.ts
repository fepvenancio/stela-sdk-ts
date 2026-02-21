/** Convert human-readable amount (e.g. "1.5") to on-chain value using decimals */
export function parseAmount(humanAmount: string, decimals: number): bigint {
  if (!humanAmount || humanAmount === '.' || humanAmount === '') return 0n
  const parts = humanAmount.split('.')
  const whole = parts[0] ?? '0'
  const frac = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + frac)
}

/** Format a raw token value (string) given its decimals */
export function formatTokenValue(raw: string | null, decimals: number): string {
  if (!raw || raw === '0') return '0'
  const n = BigInt(raw)
  if (decimals === 0) return n.toString()
  const divisor = 10n ** BigInt(decimals)
  const whole = n / divisor
  const frac = n % divisor
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}.${fracStr}`
}
