import type { Call } from './common.js'

/** State of a locker account */
export interface LockerState {
  /** Contract address of the deployed locker */
  address: string
  /** Whether the locker restrictions have been removed */
  isUnlocked: boolean
}

/** A call to be executed through the locker account */
export interface LockerCall extends Call {
  /** Locker calls use the same shape as standard StarkNet calls */
}
