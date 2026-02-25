/**
 * TypeScript interfaces mirroring the Rust matching engine models.
 * Field names and types match exactly for JSON round-trip compatibility.
 */

/** Mirrors Rust `SignedOrder` struct in models/signed_order.rs */
export interface SignedOrder {
  /** Maker's StarkNet contract address (hex string) */
  maker: string
  /** Allowed taker address. "0x0" means any taker can fill */
  allowed_taker: string
  /** Inscription ID as decimal string (u256) */
  inscription_id: string
  /** Basis points as decimal string (u256) */
  bps: string
  /** Expiry unix timestamp */
  deadline: number
  /** Unique nonce as hex string (felt252) */
  nonce: string
  /** Minimum fill basis points as decimal string (u256) */
  min_fill_bps: string
}

/** Request body for POST /orders. Mirrors Rust `SubmitOrderRequest`. */
export interface SubmitOrderRequest {
  order: SignedOrder
  /** ECDSA signature as [r, s] hex strings */
  signature: [string, string]
}

/** Mirrors Rust `TakerIntent` struct. */
export interface TakerIntent {
  /** Whether the taker wants to borrow or lend (capitalized to match Rust serde) */
  action: 'Borrow' | 'Lend'
  /** Desired amount in basis points */
  bps: number
  /** Which inscription/asset pair to match against */
  inscription_id: string
}

/** Mirrors Rust `OrderRecord` struct in models/order_record.rs */
export interface OrderRecord {
  /** UUID */
  id: string
  order_hash: string
  maker: string
  allowed_taker: string
  inscription_id: string
  bps: string
  /** Unix timestamp (i64 in Rust) */
  deadline: number
  nonce: string
  min_fill_bps: string
  signature_r: string
  signature_s: string
  status: 'open' | 'reserved' | 'soft_cancelled' | 'cancelled' | 'filled' | 'expired'
  filled_bps: string
  /** ISO string or null (Rust NaiveDateTime serializes to ISO string) */
  reserved_until: string | null
  /** ISO string */
  created_at: string
  /** ISO string */
  updated_at: string
}

/** A single matched order in the response. Mirrors Rust `MatchedOrder`. */
export interface MatchedOrder {
  order: OrderRecord
  score: number
  available_bps: number
  /** How much of this order to fill for the intent */
  fill_bps: number
}

/** Response body for POST /match. Mirrors Rust `MatchResponse`. */
export interface MatchResponse {
  matches: MatchedOrder[]
  total_available_bps: number
  fully_covered: boolean
}
