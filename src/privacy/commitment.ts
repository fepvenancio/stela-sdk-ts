import { hash, shortString } from 'starknet'
import { toU256 } from '../utils/u256.js'
import type { PrivateNote } from './types.js'

/**
 * Domain separator for note commitments.
 * Must match Cairo: COMMITMENT_DOMAIN = 'STELA_COMMITMENT_V1'
 *
 * Cairo short strings are ASCII encoded as felt252.
 * starknet.js encodeShortString does this conversion.
 */
const COMMITMENT_DOMAIN = shortString.encodeShortString('STELA_COMMITMENT_V1')

/**
 * Domain separator for nullifier derivation.
 * Must match Cairo: NULLIFIER_DOMAIN = 'STELA_NULLIFIER_V1'
 */
const NULLIFIER_DOMAIN = shortString.encodeShortString('STELA_NULLIFIER_V1')

/**
 * Compute a note commitment matching the Cairo compute_commitment function.
 *
 * commitment = Poseidon(domain, owner, inscription_id.low, inscription_id.high,
 *                       shares.low, shares.high, salt)
 */
export function computeCommitment(
  owner: string,
  inscriptionId: bigint,
  shares: bigint,
  salt: string,
): string {
  const [idLow, idHigh] = toU256(inscriptionId)
  const [sharesLow, sharesHigh] = toU256(shares)

  return hash.computePoseidonHashOnElements([
    COMMITMENT_DOMAIN,
    owner,
    idLow,
    idHigh,
    sharesLow,
    sharesHigh,
    salt,
  ])
}

/**
 * Derive a nullifier from a commitment and the owner's secret.
 * Matches Cairo: nullifier = Poseidon(domain, commitment, owner_secret)
 */
export function computeNullifier(commitment: string, ownerSecret: string): string {
  return hash.computePoseidonHashOnElements([NULLIFIER_DOMAIN, commitment, ownerSecret])
}

/**
 * Compute a Poseidon hash of two children (for Merkle tree internal nodes).
 * Matches Cairo: hash_pair(left, right) = Poseidon(left, right)
 */
export function hashPair(left: string, right: string): string {
  return hash.computePoseidonHashOnElements([left, right])
}

/**
 * Generate a random salt for commitment uniqueness.
 * Returns a hex-encoded felt252 (< 2^251).
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(31) // 31 bytes < 2^248 < FIELD_PRIME
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a full private note: generates salt, computes commitment.
 */
export function createPrivateNote(
  owner: string,
  inscriptionId: bigint,
  shares: bigint,
  salt?: string,
): PrivateNote {
  const noteSalt = salt ?? generateSalt()
  const commitment = computeCommitment(owner, inscriptionId, shares, noteSalt)
  return {
    owner,
    inscriptionId,
    shares,
    salt: noteSalt,
    commitment,
  }
}
