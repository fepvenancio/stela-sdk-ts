import type { InscriptionStatus } from '../types/common.js'
import { MAX_BPS } from '../constants/protocol.js'

/** Input shape for computeStatus — accepts both bigint and number fields */
export interface StatusInput {
  signed_at: number | bigint
  duration: number | bigint
  issued_debt_percentage: number | bigint
  is_repaid: boolean
  liquidated: boolean
  deadline?: number | bigint
  status?: string
}

/** Compute the inscription status from on-chain fields */
export function computeStatus(a: StatusInput, nowSeconds?: number): InscriptionStatus {
  if (a.is_repaid) return 'repaid'
  if (a.liquidated) return 'liquidated'
  if (a.status === 'cancelled') return 'cancelled'

  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  const signedAt = Number(a.signed_at)
  const duration = Number(a.duration)
  const deadline = a.deadline !== undefined ? Number(a.deadline) : 0
  const issuedPct = BigInt(a.issued_debt_percentage)

  // Unsigned inscription
  if (signedAt === 0) {
    // If there's a deadline and it has passed, the inscription expired
    if (deadline > 0 && now > deadline) return 'expired'
    return 'open'
  }

  // Partially filled
  if (issuedPct < MAX_BPS) return 'partial'

  // Fully filled — check if loan duration has elapsed
  if (now > signedAt + duration) return 'expired'

  return 'filled'
}
