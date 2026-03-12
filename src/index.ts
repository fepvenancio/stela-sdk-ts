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
  SignedOrder,
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
  OrderSettledEvent,
  OrderFilledEvent,
  OrderCancelledEvent,
  OrdersBulkCancelledEvent,
  StelaEvent,
  AuctionStartedEvent,
  AuctionBidEvent,
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
  CHAIN_ID,
  EXPLORER_TX_URL,
  GRACE_PERIOD,
  AUCTION_DURATION,
  AUCTION_PENALTY_BPS,
  AUCTION_RESERVE_BPS,
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
export { TOKENS, getTokensForNetwork, getNFTCollections, findTokenByAddress } from './tokens/index.js'

// ── Math ──────────────────────────────────────────────────────────────
export {
  convertToShares,
  scaleByPercentage,
  sharesToPercentage,
  calculateFeeShares,
  divCeil,
  proRataInterest,
  shareProportionBps,
  proportionalAssetValue,
  computePositionValue,
  accruedInterestWithBuffer,
  computeSafePositionFloor,
  DEFAULT_DUST_BUFFER_SECONDS,
} from './math/index.js'

export type {
  AssetValue,
  AccruedInterestEntry,
  PositionValue,
} from './math/index.js'

// ── Events ────────────────────────────────────────────────────────────
export { SELECTORS } from './events/index.js'
export { parseEvent, parseEvents } from './events/index.js'

// ── Offchain ─────────────────────────────────────────────────────────
export {
  getInscriptionOrderTypedData,
  getLendOfferTypedData,
  getBatchLendOfferTypedData,
  getCollectionLendOfferTypedData,
  getCollectionBorrowAcceptanceTypedData,
  getRenegotiationProposalTypedData,
  getCollateralSaleOfferTypedData,
  getRefinanceOfferTypedData,
  getRefinanceApprovalTypedData,
  hashAssets,
  hashBatchEntries,
  serializeSignature,
  deserializeSignature,
} from './offchain/index.js'

export type { StoredSignature, BatchEntry } from './offchain/index.js'

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
