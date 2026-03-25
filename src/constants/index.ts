export { STELA_ADDRESS, resolveNetwork, CHAIN_ID, EXPLORER_TX_URL } from './addresses.js'
export {
  MAX_BPS,
  VIRTUAL_SHARE_OFFSET,
  ASSET_TYPE_ENUM,
  ASSET_TYPE_NAMES,
  GRACE_PERIOD,
  AUCTION_DURATION,
  AUCTION_PENALTY_BPS,
  AUCTION_RESERVE_BPS,
} from './protocol.js'

export type { DeadlinePreset, DurationPreset } from './presets.js'
export {
  SWAP_DEADLINE_PRESETS,
  LEND_DEADLINE_PRESETS,
  DURATION_PRESETS,
  formatDurationHuman,
} from './presets.js'
