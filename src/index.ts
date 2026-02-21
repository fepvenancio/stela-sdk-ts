// ── Types ──────────────────────────────────────────────────────────────
export type {
  Network,
  AssetType,
  InscriptionStatus,
  Call,
  Asset,
  InscriptionParams,
  StoredInscription,
  Inscription,
  InscriptionRow,
  AssetRow,
  ApiListResponse,
  ApiDetailResponse,
  TreasuryAsset,
  ShareBalance,
  LockerInfo,
  RawEvent,
  InscriptionCreatedEvent,
  InscriptionSignedEvent,
  InscriptionCancelledEvent,
  InscriptionRepaidEvent,
  InscriptionLiquidatedEvent,
  SharesRedeemedEvent,
  TransferSingleEvent,
  StelaEvent,
  LockerState,
  LockerCall,
} from './types/index.js'

export { VALID_STATUSES, STATUS_LABELS } from './types/index.js'

// ── Constants ─────────────────────────────────────────────────────────
export {
  STELA_ADDRESS,
  resolveNetwork,
  MAX_BPS,
  VIRTUAL_SHARE_OFFSET,
  ASSET_TYPE_ENUM,
  ASSET_TYPE_NAMES,
} from './constants/index.js'

// ── Utilities ─────────────────────────────────────────────────────────
export {
  toU256,
  fromU256,
  inscriptionIdToHex,
  toHex,
  formatAddress,
  normalizeAddress,
  addressesEqual,
  parseAmount,
  formatTokenValue,
  formatDuration,
  formatTimestamp,
  computeStatus,
} from './utils/index.js'

export type { StatusInput } from './utils/index.js'

// ── Tokens ────────────────────────────────────────────────────────────
export type { TokenInfo } from './tokens/index.js'
export { TOKENS, getTokensForNetwork, findTokenByAddress } from './tokens/index.js'

// ── Math ──────────────────────────────────────────────────────────────
export {
  convertToShares,
  scaleByPercentage,
  sharesToPercentage,
  calculateFeeShares,
} from './math/index.js'

// ── Events ────────────────────────────────────────────────────────────
export { SELECTORS } from './events/index.js'
export { parseEvent, parseEvents } from './events/index.js'

// ── Clients ──────────────────────────────────────────────────────────
export {
  InscriptionClient,
  ShareClient,
  LockerClient,
  ApiClient,
  ApiError,
  StelaSdk,
} from './client/index.js'

export type {
  InscriptionClientOptions,
  ShareClientOptions,
  ApiClientOptions,
  ListInscriptionsParams,
  InscriptionEventRow,
  StelaSdkOptions,
} from './client/index.js'
