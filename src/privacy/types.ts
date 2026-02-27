/** A private share note — represents committed shares in the privacy pool. */
export interface PrivateNote {
  /** The lender who owns these shares */
  owner: string
  /** The inscription ID */
  inscriptionId: bigint
  /** Number of shares */
  shares: bigint
  /** Random salt for commitment uniqueness */
  salt: string
  /** The commitment (Poseidon hash of above fields) */
  commitment: string
}

/** Request to privately redeem shares (matches Cairo PrivateRedeemRequest). */
export interface PrivateRedeemRequest {
  /** Merkle root the proof was generated against */
  root: string
  /** The inscription ID */
  inscriptionId: bigint
  /** Number of shares being redeemed */
  shares: bigint
  /** Nullifier (prevents double-spend) */
  nullifier: string
  /** Change commitment (for partial redemption). '0' if full redemption. */
  changeCommitment: string
  /** Recipient address for redeemed assets */
  recipient: string
}
