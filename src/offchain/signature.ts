/**
 * Serialize a starknet.js signature (Signature type) for storage in D1.
 */
export interface StoredSignature {
  r: string
  s: string
}

export function serializeSignature(sig: string[]): StoredSignature {
  return { r: sig[0], s: sig[1] }
}

export function deserializeSignature(stored: StoredSignature): string[] {
  return [stored.r, stored.s]
}
