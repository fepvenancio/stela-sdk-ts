# Types Reference

All exported types and interfaces from `@fepvenancio/stela-sdk`.

---

## Core Types

### Network

```ts
type Network = 'sepolia' | 'mainnet'
```

Supported StarkNet networks.

### AssetType

```ts
type AssetType = 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC4626'
```

Token standard types supported by the protocol.

### InscriptionStatus

```ts
type InscriptionStatus =
  | 'open' | 'partial' | 'filled' | 'repaid'
  | 'liquidated' | 'expired' | 'cancelled'
```

Possible states of an inscription.

### Call

```ts
interface Call {
  contractAddress: string
  entrypoint: string
  calldata: string[]
}
```

A single StarkNet call. Matches the starknet.js `Call` type shape. All `build*` methods return this.

---

## Inscription Types

### Asset

```ts
interface Asset {
  asset_address: string    // Contract address of the token
  asset_type: AssetType    // Token standard
  value: bigint            // Token amount (ERC20/ERC1155/ERC4626)
  token_id: bigint         // Token ID (ERC721/ERC1155), 0n for fungibles
}
```

An asset within an inscription. Matches the Cairo `Asset` struct.

### InscriptionParams

```ts
interface InscriptionParams {
  is_borrow: boolean             // true = borrower created it, false = lender created it
  debt_assets: Asset[]           // What the borrower wants to borrow
  interest_assets: Asset[]       // What the borrower will pay as interest
  collateral_assets: Asset[]     // What the borrower locks as collateral
  duration: bigint               // Loan duration in seconds
  deadline: bigint               // Order deadline as unix timestamp (seconds)
  multi_lender: boolean          // Whether multiple lenders can partially fill
}
```

Parameters for creating a new inscription. Matches Cairo `InscriptionParams`.

### StoredInscription

```ts
interface StoredInscription {
  borrower: string                  // Borrower address
  lender: string                    // Lender address (0x0 if unsigned)
  duration: bigint                  // Loan duration in seconds
  deadline: bigint                  // Order deadline as unix timestamp
  signed_at: bigint                 // Timestamp when signed (0n if unsigned)
  issued_debt_percentage: bigint    // Percentage of debt issued (BPS, max 10000)
  is_repaid: boolean                // Whether the loan has been repaid
  liquidated: boolean               // Whether the loan has been liquidated
  multi_lender: boolean             // Whether multiple lenders can fill
  debt_asset_count: number          // Number of debt assets
  interest_asset_count: number      // Number of interest assets
  collateral_asset_count: number    // Number of collateral assets
}
```

Raw inscription data as stored on-chain. Returned by `InscriptionClient.getInscription()`.

### Inscription

```ts
interface Inscription extends StoredInscription {
  id: string                       // Inscription ID as hex string
  status: InscriptionStatus        // Computed status
}
```

Parsed inscription with computed status and ID.

### SignedOrder

```ts
interface SignedOrder {
  maker: string            // Address of the order creator
  allowed_taker: string    // Restrict who can fill ('0x0' = anyone)
  inscription_id: bigint   // ID of the target inscription
  bps: bigint              // Basis points of debt to fill (max 10000)
  deadline: bigint         // Unix timestamp after which the order expires
  nonce: string            // Maker's nonce for replay protection
  min_fill_bps: bigint     // Minimum BPS a taker must fill per tx (0 = any)
}
```

Signed order for the matching engine. Matches the Cairo `SignedOrder` struct.

---

## API Types

### InscriptionRow

```ts
interface InscriptionRow {
  id: string                         // Hex inscription ID
  creator: string                    // Creator address
  borrower: string | null            // Borrower address (null if unsigned)
  lender: string | null              // Lender address (null if unsigned)
  status: string                     // Status string
  issued_debt_percentage: string     // BPS as string
  multi_lender: boolean
  duration: string                   // Duration in seconds as string
  deadline: string                   // Unix timestamp as string
  signed_at: string | null           // Sign timestamp as string
  debt_asset_count: number
  interest_asset_count: number
  collateral_asset_count: number
  created_at_ts: string              // Creation timestamp
  assets: AssetRow[]                 // Associated assets
}
```

Row shape returned by the `/api/inscriptions` list endpoint.

### AssetRow

```ts
interface AssetRow {
  inscription_id: string
  asset_role: 'debt' | 'interest' | 'collateral'
  asset_index: number
  asset_address: string
  asset_type: string
  value: string | null
  token_id: string | null
}
```

Asset row from the `inscription_assets` table.

### ApiListResponse\<T\>

```ts
interface ApiListResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}
```

Standard API response envelope for list endpoints.

### ApiDetailResponse\<T\>

```ts
interface ApiDetailResponse<T> {
  data: T
}
```

Standard API response envelope for detail endpoints.

### TreasuryAsset

```ts
interface TreasuryAsset {
  asset_address: string
  asset_type: string
  balance: string
}
```

Treasury asset balance info.

### ShareBalance

```ts
interface ShareBalance {
  inscription_id: string
  holder: string
  balance: string
}
```

ERC1155 share balance for a lender on an inscription.

### LockerInfo

```ts
interface LockerInfo {
  inscription_id: string
  locker_address: string
  is_unlocked: boolean
}
```

Locker account info for an inscription.

### InscriptionEventRow

```ts
interface InscriptionEventRow {
  id: number
  inscription_id: string
  event_type: string
  tx_hash: string
  block_number: number
  timestamp: string | null
  data: Record<string, unknown> | null
}
```

Shape of an inscription event row from the API.

---

## Event Types

### RawEvent

```ts
interface RawEvent {
  keys: string[]
  data: string[]
  transaction_hash: string
  block_number: number
}
```

Raw event as returned from StarkNet RPC.

### StelaEvent

```ts
type StelaEvent =
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
```

Discriminated union of all Stela protocol events. Use the `type` field to narrow.

### InscriptionCreatedEvent

```ts
interface InscriptionCreatedEvent {
  type: 'InscriptionCreated'
  inscription_id: bigint
  creator: string
  is_borrow: boolean
  transaction_hash: string
  block_number: number
}
```

### InscriptionSignedEvent

```ts
interface InscriptionSignedEvent {
  type: 'InscriptionSigned'
  inscription_id: bigint
  borrower: string
  lender: string
  issued_debt_percentage: bigint
  shares_minted: bigint
  transaction_hash: string
  block_number: number
}
```

### InscriptionCancelledEvent

```ts
interface InscriptionCancelledEvent {
  type: 'InscriptionCancelled'
  inscription_id: bigint
  creator: string
  transaction_hash: string
  block_number: number
}
```

### InscriptionRepaidEvent

```ts
interface InscriptionRepaidEvent {
  type: 'InscriptionRepaid'
  inscription_id: bigint
  repayer: string
  transaction_hash: string
  block_number: number
}
```

### InscriptionLiquidatedEvent

```ts
interface InscriptionLiquidatedEvent {
  type: 'InscriptionLiquidated'
  inscription_id: bigint
  liquidator: string
  transaction_hash: string
  block_number: number
}
```

### SharesRedeemedEvent

```ts
interface SharesRedeemedEvent {
  type: 'SharesRedeemed'
  inscription_id: bigint
  redeemer: string
  shares: bigint
  transaction_hash: string
  block_number: number
}
```

### TransferSingleEvent

```ts
interface TransferSingleEvent {
  type: 'TransferSingle'
  operator: string
  from: string
  to: string
  id: bigint
  value: bigint
  transaction_hash: string
  block_number: number
}
```

ERC1155 `TransferSingle` event from the Stela contract.

### OrderSettledEvent

```ts
interface OrderSettledEvent {
  type: 'OrderSettled'
  inscription_id: bigint
  borrower: string
  lender: string
  relayer: string
  relayer_fee_amount: bigint
  transaction_hash: string
  block_number: number
}
```

Emitted by `settle()`.

### OrderFilledEvent

```ts
interface OrderFilledEvent {
  type: 'OrderFilled'
  inscription_id: bigint
  order_hash: string
  taker: string
  fill_bps: bigint
  total_filled_bps: bigint
  transaction_hash: string
  block_number: number
}
```

Emitted by `fill_signed_order()`.

### OrderCancelledEvent

```ts
interface OrderCancelledEvent {
  type: 'OrderCancelled'
  order_hash: string
  maker: string
  transaction_hash: string
  block_number: number
}
```

Emitted by `cancel_order()`.

### OrdersBulkCancelledEvent

```ts
interface OrdersBulkCancelledEvent {
  type: 'OrdersBulkCancelled'
  maker: string
  new_min_nonce: string
  transaction_hash: string
  block_number: number
}
```

Emitted by `cancel_orders_by_nonce()`.


---

## Locker Types

### LockerState

```ts
interface LockerState {
  address: string       // Contract address of the deployed locker
  isUnlocked: boolean   // Whether locker restrictions have been removed
}
```

### LockerCall

```ts
interface LockerCall extends Call {}
```

A call to be executed through the locker account. Same shape as `Call`.

---

## Token Types

### TokenInfo

```ts
interface TokenInfo {
  symbol: string
  name: string
  decimals: number
  addresses: Partial<Record<Network, string>>
  logoUrl?: string
}
```

Token information from the registry.

---

## Offchain Types

### StoredSignature

```ts
interface StoredSignature {
  r: string
  s: string
}
```

Serialized signature for database storage.

---

## Status Types

### StatusInput

```ts
interface StatusInput {
  signed_at: number | bigint
  duration: number | bigint
  issued_debt_percentage: number | bigint
  is_repaid: boolean
  liquidated: boolean
  deadline?: number | bigint
  status?: string
}
```

Input shape for `computeStatus()`. Accepts both `bigint` and `number` fields.

---

## Client Option Types

### InscriptionClientOptions

```ts
interface InscriptionClientOptions {
  stelaAddress: string
  provider: RpcProvider
  account?: Account
}
```

### ShareClientOptions

```ts
interface ShareClientOptions {
  stelaAddress: string
  provider: RpcProvider
}
```

### ApiClientOptions

```ts
interface ApiClientOptions {
  baseUrl?: string    // Defaults to 'https://stela-dapp.xyz/api'
}
```

### ListInscriptionsParams

```ts
interface ListInscriptionsParams {
  status?: string
  address?: string
  page?: number
  limit?: number
}
```

### StelaSdkOptions

```ts
interface StelaSdkOptions {
  provider: RpcProvider
  account?: Account
  network?: Network | string
  apiBaseUrl?: string
  stelaAddress?: string
}
```

---

## Constants (Value Exports)

### VALID_STATUSES

```ts
const VALID_STATUSES: readonly InscriptionStatus[]
// ['open', 'partial', 'filled', 'repaid', 'liquidated', 'expired', 'cancelled']
```

### STATUS_LABELS

```ts
const STATUS_LABELS: Record<InscriptionStatus, string>
// { open: 'Open', partial: 'Partial', filled: 'Filled', repaid: 'Repaid',
//   liquidated: 'Liquidated', expired: 'Expired', cancelled: 'Cancelled' }
```
