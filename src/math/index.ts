export {
  convertToShares,
  scaleByPercentage,
  sharesToPercentage,
  calculateFeeShares,
  divCeil,
  proRataInterest,
} from './shares.js'

export {
  shareProportionBps,
  proportionalAssetValue,
  computePositionValue,
  accruedInterestWithBuffer,
  computeSafePositionFloor,
  DEFAULT_DUST_BUFFER_SECONDS,
} from './position.js'

export type {
  AssetValue,
  AccruedInterestEntry,
  PositionValue,
} from './position.js'
