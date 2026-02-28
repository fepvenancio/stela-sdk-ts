export type { PrivateNote, PrivateRedeemRequest } from './types.js'
export {
  computeCommitment,
  computeDepositCommitment,
  computeNullifier,
  hashPair,
  generateSalt,
  createPrivateNote,
} from './commitment.js'
