/** Raw event as returned from StarkNet RPC */
export interface RawEvent {
  keys: string[]
  data: string[]
  transaction_hash: string
  block_number: number
}

/** InscriptionCreated event */
export interface InscriptionCreatedEvent {
  type: 'InscriptionCreated'
  inscription_id: bigint
  creator: string
  is_borrow: boolean
  transaction_hash: string
  block_number: number
}

/** InscriptionSigned event */
export interface InscriptionSignedEvent {
  type: 'InscriptionSigned'
  inscription_id: bigint
  borrower: string
  lender: string
  issued_debt_percentage: bigint
  shares_minted: bigint
  transaction_hash: string
  block_number: number
}

/** InscriptionCancelled event */
export interface InscriptionCancelledEvent {
  type: 'InscriptionCancelled'
  inscription_id: bigint
  creator: string
  transaction_hash: string
  block_number: number
}

/** InscriptionRepaid event */
export interface InscriptionRepaidEvent {
  type: 'InscriptionRepaid'
  inscription_id: bigint
  repayer: string
  transaction_hash: string
  block_number: number
}

/** InscriptionLiquidated event */
export interface InscriptionLiquidatedEvent {
  type: 'InscriptionLiquidated'
  inscription_id: bigint
  liquidator: string
  transaction_hash: string
  block_number: number
}

/** SharesRedeemed event */
export interface SharesRedeemedEvent {
  type: 'SharesRedeemed'
  inscription_id: bigint
  redeemer: string
  shares: bigint
  transaction_hash: string
  block_number: number
}

/** TransferSingle (ERC1155) event from the Stela contract */
export interface TransferSingleEvent {
  type: 'TransferSingle'
  operator: string
  from: string
  to: string
  id: bigint
  value: bigint
  transaction_hash: string
  block_number: number
}

/** OrderSettled event (emitted by settle()) */
export interface OrderSettledEvent {
  type: 'OrderSettled'
  inscription_id: bigint
  borrower: string
  lender: string
  relayer: string
  relayer_fee_amount: bigint
  transaction_hash: string
  block_number: number
}

/** OrderFilled event (emitted by fill_signed_order()) */
export interface OrderFilledEvent {
  type: 'OrderFilled'
  inscription_id: bigint
  order_hash: string
  taker: string
  fill_bps: bigint
  total_filled_bps: bigint
  transaction_hash: string
  block_number: number
}

/** OrderCancelled event (emitted by cancel_order()) */
export interface OrderCancelledEvent {
  type: 'OrderCancelled'
  order_hash: string
  maker: string
  transaction_hash: string
  block_number: number
}

/** OrdersBulkCancelled event (emitted by cancel_orders_by_nonce()) */
export interface OrdersBulkCancelledEvent {
  type: 'OrdersBulkCancelled'
  maker: string
  new_min_nonce: string
  transaction_hash: string
  block_number: number
}

/** Discriminated union of all Stela protocol events */
export type StelaEvent =
  | InscriptionCreatedEvent
  | InscriptionSignedEvent
  | InscriptionCancelledEvent
  | InscriptionRepaidEvent
  | InscriptionLiquidatedEvent
  | SharesRedeemedEvent
  | TransferSingleEvent
  | OrderSettledEvent
  | OrderFilledEvent
  | OrderCancelledEvent
  | OrdersBulkCancelledEvent
