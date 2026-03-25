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
  InscriptionDetailResponse,
  CollectionOfferRow,
  RefinanceRow,
  RenegotiationRow,
  CollateralSaleRow,
  OrderStatus,
  OrderRow,
  OrderOfferRow,
  ShareListingRow,
  LendingLevel,
  SwapLevel,
  TokenDisplay,
  OrderBookResponse,
  DurationFilter,
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

export { VALID_STATUSES, STATUS_LABELS, DURATION_RANGES } from './types/index.js'

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
  SWAP_DEADLINE_PRESETS,
  LEND_DEADLINE_PRESETS,
  DURATION_PRESETS,
  formatDurationHuman,
} from './constants/index.js'

export type { DeadlinePreset, DurationPreset } from './constants/index.js'

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
  enrichStatus,
  getStatusBadgeVariant,
  getStatusLabel,
  getOrderStatusBadgeVariant,
  getOrderStatusLabel,
  inscriptionMatchesGroup,
  orderMatchesGroup,
  ORDER_STATUS_LABELS,
  INSCRIPTION_STATUS_GROUPS,
  ORDER_STATUS_GROUPS,
  STATUS_DESCRIPTIONS,
  CONCEPT_DESCRIPTIONS,
  normalizeOrderData,
  parseOrderRow,
  formatSig,
  parseSigToArray,
  serializeAssetCalldata,
  parseAssetArray,
  parseInscriptionCalldata,
  serializeSignatureCalldata,
} from './utils/index.js'

export type {
  StatusInput,
  EnrichedStatus,
  StatusBadgeVariant,
  SerializedAsset,
  RawOrderData,
  ParsedOrderData,
  StoredAsset,
} from './utils/index.js'

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
  computeInterestRate,
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
  getTermsAcknowledgmentTypedData,
  getCancelOrderTypedData,
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
  getNonce,
} from './client/index.js'

export type {
  InscriptionClientOptions,
  ShareClientOptions,
  ApiClientOptions,
  ListInscriptionsParams,
  InscriptionEventRow,
  StelaSdkOptions,
} from './client/index.js'
