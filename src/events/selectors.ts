import { hash } from 'starknet'

/** Event selectors for all Stela protocol events */
export const SELECTORS = {
  InscriptionCreated: hash.getSelectorFromName('InscriptionCreated'),
  InscriptionSigned: hash.getSelectorFromName('InscriptionSigned'),
  InscriptionCancelled: hash.getSelectorFromName('InscriptionCancelled'),
  InscriptionRepaid: hash.getSelectorFromName('InscriptionRepaid'),
  InscriptionLiquidated: hash.getSelectorFromName('InscriptionLiquidated'),
  SharesRedeemed: hash.getSelectorFromName('SharesRedeemed'),
  TransferSingle: hash.getSelectorFromName('TransferSingle'),
  OrderSettled: hash.getSelectorFromName('OrderSettled'),
  OrderFilled: hash.getSelectorFromName('OrderFilled'),
  OrderCancelled: hash.getSelectorFromName('OrderCancelled'),
  OrdersBulkCancelled: hash.getSelectorFromName('OrdersBulkCancelled'),
} as const
