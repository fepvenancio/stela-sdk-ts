import { uint256 } from 'starknet'
import type { RawEvent, StelaEvent } from '../types/events.js'
import { SELECTORS } from './selectors.js'

/** Convert two felt strings (low, high) into a bigint */
function feltsToU256(low: string, high: string): bigint {
  return uint256.uint256ToBN({ low: BigInt(low), high: BigInt(high) })
}

/** Parse a single raw event into a typed StelaEvent. Returns null if unrecognized. */
export function parseEvent(raw: RawEvent): StelaEvent | null {
  const selector = raw.keys[0]

  switch (selector) {
    case SELECTORS.InscriptionCreated: {
      // keys: [selector, id_low, id_high, creator]
      // data: [is_borrow]
      return {
        type: 'InscriptionCreated',
        inscription_id: feltsToU256(raw.keys[1], raw.keys[2]),
        creator: raw.keys[3],
        is_borrow: BigInt(raw.data[0]) !== 0n,
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    case SELECTORS.InscriptionSigned: {
      // keys: [selector, id_low, id_high, borrower, lender]
      // data: [pct_low, pct_high, shares_low, shares_high]
      return {
        type: 'InscriptionSigned',
        inscription_id: feltsToU256(raw.keys[1], raw.keys[2]),
        borrower: raw.keys[3],
        lender: raw.keys[4],
        issued_debt_percentage: feltsToU256(raw.data[0], raw.data[1]),
        shares_minted: feltsToU256(raw.data[2], raw.data[3]),
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    case SELECTORS.InscriptionCancelled: {
      // keys: [selector, id_low, id_high]
      // data: [creator]
      return {
        type: 'InscriptionCancelled',
        inscription_id: feltsToU256(raw.keys[1], raw.keys[2]),
        creator: raw.data[0],
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    case SELECTORS.InscriptionRepaid: {
      // keys: [selector, id_low, id_high]
      // data: [repayer]
      return {
        type: 'InscriptionRepaid',
        inscription_id: feltsToU256(raw.keys[1], raw.keys[2]),
        repayer: raw.data[0],
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    case SELECTORS.InscriptionLiquidated: {
      // keys: [selector, id_low, id_high]
      // data: [liquidator]
      return {
        type: 'InscriptionLiquidated',
        inscription_id: feltsToU256(raw.keys[1], raw.keys[2]),
        liquidator: raw.data[0],
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    case SELECTORS.SharesRedeemed: {
      // keys: [selector, id_low, id_high, redeemer]
      // data: [shares_low, shares_high]
      return {
        type: 'SharesRedeemed',
        inscription_id: feltsToU256(raw.keys[1], raw.keys[2]),
        redeemer: raw.keys[3],
        shares: feltsToU256(raw.data[0], raw.data[1]),
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    case SELECTORS.TransferSingle: {
      // keys: [selector, operator, from, to]
      // data: [id_low, id_high, value_low, value_high]
      return {
        type: 'TransferSingle',
        operator: raw.keys[1],
        from: raw.keys[2],
        to: raw.keys[3],
        id: feltsToU256(raw.data[0], raw.data[1]),
        value: feltsToU256(raw.data[2], raw.data[3]),
        transaction_hash: raw.transaction_hash,
        block_number: raw.block_number,
      }
    }

    default:
      return null
  }
}

/** Parse an array of raw events, skipping unrecognized ones. */
export function parseEvents(rawEvents: RawEvent[]): StelaEvent[] {
  const results: StelaEvent[] = []
  for (const raw of rawEvents) {
    const parsed = parseEvent(raw)
    if (parsed) results.push(parsed)
  }
  return results
}
