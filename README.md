# @fepvenancio/stela-sdk

TypeScript SDK for the **Stela** P2P lending protocol on StarkNet.

Stela enables peer-to-peer lending through on-chain inscriptions. Borrowers post collateral and request loans; lenders sign inscriptions to fund them. The protocol manages collateral locking via token-bound locker accounts, multi-lender share accounting through ERC1155 tokens, and automated liquidation of expired positions. An off-chain signing model allows gasless order creation and settlement through relayer bots.

## Stack

- **TypeScript** (ESM + CJS dual build via tsup)
- **starknet.js v6** — RPC calls, SNIP-12 typed data, Poseidon hashing
- **Vitest** for testing

## Installation

```bash
npm install @fepvenancio/stela-sdk starknet
```

```bash
pnpm add @fepvenancio/stela-sdk starknet
```

`starknet` is a peer dependency (^6.0.0).

## Quick Start

### Using the SDK Facade

```typescript
import { StelaSdk } from '@fepvenancio/stela-sdk'
import { RpcProvider, Account } from 'starknet'

const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' })
const account = new Account(provider, address, privateKey)

const sdk = new StelaSdk({ provider, account, network: 'sepolia' })

// Read an inscription
const inscription = await sdk.inscriptions.getInscription(1n)

// Check share balance
const shares = await sdk.shares.balanceOf(myAddress, 1n)

// Query the indexer API
const list = await sdk.api.listInscriptions({ status: 'open' })
```

### Using Individual Clients

```typescript
import { InscriptionClient, ShareClient, STELA_ADDRESS } from '@fepvenancio/stela-sdk'
import { RpcProvider } from 'starknet'

const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' })

const inscriptions = new InscriptionClient({
  stelaAddress: STELA_ADDRESS.sepolia,
  provider,
})

const data = await inscriptions.getInscription(1n)
```

## API Reference

### StelaSdk

Main facade that wires together all clients.

```typescript
const sdk = new StelaSdk({
  provider,          // StarkNet RPC provider
  account?,          // Account for write operations (optional for read-only)
  network?,          // 'sepolia' | 'mainnet' (default: 'sepolia')
  apiBaseUrl?,       // Custom indexer API URL
  stelaAddress?,     // Override contract address
})

sdk.inscriptions   // InscriptionClient
sdk.shares         // ShareClient
sdk.locker         // LockerClient
sdk.api            // ApiClient
```

---

### InscriptionClient

On-chain reads and transaction builders for the Stela protocol contract.

#### Read Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getInscription(id)` | `StoredInscription` | Fetch raw on-chain inscription data |
| `getLocker(id)` | `string` | Get the locker TBA address for an inscription |
| `getInscriptionFee()` | `bigint` | Current protocol inscription fee |
| `convertToShares(id, percentage)` | `bigint` | Convert a fill percentage to shares |
| `getNonce(address)` | `bigint` | Get the off-chain signing nonce for an address |
| `getRelayerFee()` | `bigint` | Current relayer fee (in BPS) |
| `getTreasury()` | `string` | Treasury contract address |
| `isPaused()` | `boolean` | Whether the protocol is paused |
| `isOrderRegistered(orderHash)` | `boolean` | Check if an off-chain order is registered |
| `isOrderCancelled(orderHash)` | `boolean` | Check if an order has been cancelled |
| `getFilledBps(orderHash)` | `bigint` | Get filled basis points for a signed order |
| `getMakerMinNonce(maker)` | `string` | Get minimum valid nonce for a maker |

#### Call Builders

Return a `Call` object for use with `account.execute()`. Bundle multiple calls (including ERC20 approvals) into a single transaction.

| Method | Description |
|--------|-------------|
| `buildCreateInscription(params)` | Create an inscription on-chain |
| `buildSignInscription(id, bps)` | Sign (fund) an inscription at a given BPS |
| `buildCancelInscription(id)` | Cancel an open inscription |
| `buildRepay(id)` | Repay a filled inscription |
| `buildLiquidate(id)` | Liquidate an expired inscription |
| `buildRedeem(id, shares)` | Redeem shares for underlying assets |
| `buildSettle(params)` | Settle an off-chain order (used by relayer bots) |
| `buildBatchSettle(params)` | Settle multiple off-chain orders atomically with 1 lender signature (BatchLendOffer) |
| `buildFillSignedOrder(order, sig, fillBps)` | Fill a signed order on-chain |
| `buildCancelOrder(order)` | Cancel a specific signed order |
| `buildCancelOrdersByNonce(minNonce)` | Bulk cancel orders below a nonce |

#### Execute Methods

Convenience wrappers that call `account.execute()` directly. Accept optional `approvals` for bundling ERC20 approves.

| Method | Description |
|--------|-------------|
| `execute(calls)` | Execute arbitrary calls via the connected account |
| `createInscription(params, approvals?)` | Create inscription with optional token approvals |
| `signInscription(id, bps, approvals?)` | Fund an inscription |
| `cancelInscription(id)` | Cancel an inscription |
| `repay(id, approvals?)` | Repay a loan |
| `liquidate(id)` | Liquidate an expired loan |
| `redeem(id, shares)` | Redeem ERC1155 shares |
| `fillSignedOrder(order, sig, fillBps, approvals?)` | Fill a signed order |
| `cancelOrder(order)` | Cancel a signed order |
| `cancelOrdersByNonce(minNonce)` | Bulk cancel by nonce |

---

### ShareClient

Read-only client for ERC1155 share token queries. Inscription IDs are used as ERC1155 token IDs.

| Method | Returns | Description |
|--------|---------|-------------|
| `balanceOf(account, inscriptionId)` | `bigint` | Share balance for an account on an inscription |
| `balanceOfBatch(accounts, ids)` | `bigint[]` | Batch query multiple balances |
| `isApprovedForAll(owner, operator)` | `boolean` | Check operator approval |

---

### LockerClient

Interact with collateral locker TBA (Token Bound Account) contracts.

| Method | Returns | Description |
|--------|---------|-------------|
| `getLockerAddress(id)` | `string` | Get locker TBA address for an inscription |
| `isUnlocked(id)` | `boolean` | Check if a locker is unlocked |
| `getLockerState(id)` | `LockerState` | Full locker state (address + unlock status) |
| `getLockerBalance(id, tokenAddress)` | `bigint` | ERC20 balance held by the locker |
| `getLockerBalances(id, tokenAddresses)` | `Map<string, bigint>` | Multiple ERC20 balances |
| `buildLockerExecute(lockerAddr, calls)` | `Call` | Build a governance call through the locker |
| `executeThrough(id, call)` | `{ transaction_hash }` | Execute a single call through the locker |
| `executeThroughBatch(id, calls)` | `{ transaction_hash }` | Execute multiple calls through the locker |

---

### ApiClient

HTTP client for the Stela indexer API. Provides typed access to indexed data.

```typescript
const api = new ApiClient({ baseUrl: 'https://stela-dapp.xyz/api' })
```

| Method | Returns | Description |
|--------|---------|-------------|
| `listInscriptions(params?)` | `ApiListResponse<InscriptionRow>` | List inscriptions with filters (status, address, page, limit) |
| `getInscription(id)` | `ApiDetailResponse<InscriptionRow>` | Get a single inscription |
| `getInscriptionEvents(id)` | `ApiListResponse<InscriptionEventRow>` | Get events for an inscription |
| `getTreasuryView(address)` | `ApiListResponse<TreasuryAsset>` | Treasury asset balances |
| `getLockers(address)` | `ApiListResponse<LockerInfo>` | Locker info for an address |
| `getShareBalances(address)` | `ApiListResponse<ShareBalance>` | Share balances for an address |

---

### Off-Chain Signing

Functions for creating SNIP-12 typed data for gasless order creation and settlement.

```typescript
import {
  getInscriptionOrderTypedData,
  getLendOfferTypedData,
  getBatchLendOfferTypedData,
  hashAssets,
  hashBatchEntries,
  serializeSignature,
  deserializeSignature,
} from '@fepvenancio/stela-sdk'
```

| Function | Description |
|----------|-------------|
| `getInscriptionOrderTypedData(params)` | Build SNIP-12 typed data for a borrower's InscriptionOrder |
| `getLendOfferTypedData(params)` | Build SNIP-12 typed data for a lender's LendOffer |
| `getBatchLendOfferTypedData(params)` | Build SNIP-12 typed data for a lender's BatchLendOffer (multi-order settlement) |
| `getCollectionLendOfferTypedData(params)` | Build SNIP-12 typed data for a collection-wide lending offer |
| `getCollectionBorrowAcceptanceTypedData(params)` | Build SNIP-12 typed data for accepting a collection offer |
| `getRenegotiationProposalTypedData(params)` | Build SNIP-12 typed data for a renegotiation proposal |
| `getCollateralSaleOfferTypedData(params)` | Build SNIP-12 typed data for a collateral sale offer |
| `getRefinanceOfferTypedData(params)` | Build SNIP-12 typed data for a refinance offer |
| `getRefinanceApprovalTypedData(params)` | Build SNIP-12 typed data for approving a refinance |
| `getTermsAcknowledgmentTypedData(params)` | Build SNIP-12 typed data for terms acknowledgment |
| `getCancelOrderTypedData(orderId, chainId)` | Build SNIP-12 typed data for off-chain order cancellation |
| `hashAssets(assets)` | Poseidon hash of an asset array (matches Cairo's `hash_assets()`) |
| `hashBatchEntries(entries)` | Poseidon hash of BatchEntry array for batch_settle() |
| `serializeSignature(sig)` | Convert `string[]` signature to `{ r, s }` for storage |
| `deserializeSignature(stored)` | Convert `{ r, s }` back to `string[]` |
| `getNonce(provider, stelaAddress, accountAddress)` | Read on-chain nonce via RPC (uses `latest` block) |

---

### Math Utilities

Share calculation helpers that mirror the on-chain math.

```typescript
import {
  convertToShares,
  scaleByPercentage,
  sharesToPercentage,
  calculateFeeShares,
  divCeil,
  proRataInterest,
  computeInterestRate,
  computePositionValue,
  computeSafePositionFloor,
} from '@fepvenancio/stela-sdk'
```

| Function | Description |
|----------|-------------|
| `convertToShares(percentage, totalSupply, currentIssuedPercentage)` | Convert fill percentage to shares |
| `scaleByPercentage(value, percentage)` | Scale a value by basis points |
| `sharesToPercentage(shares, totalSupply, currentIssuedPercentage)` | Convert shares back to percentage |
| `calculateFeeShares(shares, feeBps)` | Calculate fee portion of shares |
| `divCeil(a, b)` | Ceiling division (rounds up) |
| `proRataInterest(amount, elapsed, duration)` | Pro-rata interest with ceiling rounding |
| `computeInterestRate(debtAssets, interestAssets)` | Interest/debt ratio (skips ERC721, returns `null` if zero debt) |
| `shareProportionBps(shares, totalSupply)` | Share proportion in basis points |
| `proportionalAssetValue(assetValue, shares, totalSupply)` | Asset value proportional to shares |
| `computePositionValue(params)` | Full position valuation (debt, interest, collateral) |
| `accruedInterestWithBuffer(amount, elapsed, duration, buffer?)` | Accrued interest + dust buffer |
| `computeSafePositionFloor(params)` | Safe minimum price for buying shares |

---

### Event Parsing

Parse raw StarkNet events into typed SDK event objects.

```typescript
import { parseEvent, parseEvents, SELECTORS } from '@fepvenancio/stela-sdk'
```

| Export | Description |
|--------|-------------|
| `SELECTORS` | Map of event name to selector hash for all protocol events |
| `parseEvent(raw)` | Parse a single raw event into a typed `StelaEvent` |
| `parseEvents(raws)` | Parse an array of raw events |

Supported event types: `InscriptionCreated`, `InscriptionSigned`, `InscriptionCancelled`, `InscriptionRepaid`, `InscriptionLiquidated`, `SharesRedeemed`, `TransferSingle`, `OrderSettled`, `OrderFilled`, `OrderCancelled`, `OrdersBulkCancelled`.

---

### Token Registry

Curated token list for StarkNet (mainnet + sepolia).

```typescript
import { TOKENS, getTokensForNetwork, findTokenByAddress } from '@fepvenancio/stela-sdk'
```

| Export | Description |
|--------|-------------|
| `TOKENS` | Full token list (ETH, STRK, USDC, USDT, WBTC, DAI, wstETH + testnet mocks) |
| `getTokensForNetwork(network)` | Filter tokens available on a specific network |
| `findTokenByAddress(address)` | Look up token info by contract address |

---

### Utility Functions

```typescript
import {
  toU256, fromU256, inscriptionIdToHex, toHex,
  formatAddress, normalizeAddress, addressesEqual,
  parseAmount, formatTokenValue,
  formatDuration, formatTimestamp, formatDurationHuman,
  computeStatus, enrichStatus,
  normalizeOrderData, parseOrderRow,
  formatSig, parseSigToArray,
  serializeAssetCalldata, parseAssetArray, parseInscriptionCalldata,
} from '@fepvenancio/stela-sdk'
```

#### Address & Formatting

| Function | Description |
|----------|-------------|
| `toU256(value)` | Convert bigint to `[low, high]` string pair for Cairo u256 |
| `fromU256({ low, high })` | Convert Cairo u256 back to bigint |
| `inscriptionIdToHex(id)` | Format inscription ID as hex string |
| `toHex(value)` | Convert bigint/number to hex string |
| `formatAddress(address)` | Shorten an address for display (`0x1234...abcd`) |
| `normalizeAddress(address)` | Pad and checksum an address |
| `addressesEqual(a, b)` | Case-insensitive address comparison |
| `parseAmount(value, decimals)` | Parse human-readable amount to bigint |
| `formatTokenValue(value, decimals)` | Format bigint token value for display |
| `formatDuration(seconds)` | Format seconds as compact duration (`7d 0h`) |
| `formatTimestamp(timestamp)` | Format unix timestamp as date string |
| `formatDurationHuman(seconds)` | Format seconds as human-readable (`5 min`, `2 hours`, `7 days`) |

#### Status Computation

| Function | Description |
|----------|-------------|
| `computeStatus(input)` | Derive inscription status from on-chain fields |
| `enrichStatus(row)` | Compute display status — distinguishes `overdue`, `grace_period`, `auctioned` from base `expired` |
| `getStatusBadgeVariant(status)` | Map any status to a `StatusBadgeVariant` for UI |
| `getStatusLabel(status)` | Human-readable label for any status (base + extended) |
| `getOrderStatusBadgeVariant(status)` | Badge variant for off-chain order status |
| `getOrderStatusLabel(status)` | Human-readable label for order status |
| `inscriptionMatchesGroup(status, group)` | Check if inscription status belongs to filter group (`open`/`active`/`closed`/`all`) |
| `orderMatchesGroup(status, group)` | Check if order status belongs to filter group |

#### Order Data Parsing

| Function | Description |
|----------|-------------|
| `normalizeOrderData(raw)` | Normalize camelCase/snake_case variants in order_data JSON |
| `parseOrderRow(row)` | Parse D1 order row — sanitizes assets, strips signature for non-pending orders |

#### Signature Utilities

| Function | Description |
|----------|-------------|
| `formatSig(signature)` | Format wallet signature (array or `{r, s}`) to `string[]` — converts bigints to hex |
| `parseSigToArray(raw)` | Parse stored signature (JSON array, JSON object, CSV, or string array) to `string[]` |

#### Calldata Serialization

| Function | Description |
|----------|-------------|
| `serializeAssetCalldata(assets)` | Serialize asset array to Cairo calldata `[len, ...fields]` |
| `parseAssetArray(calldata, offset)` | Deserialize asset array from RPC calldata |
| `parseInscriptionCalldata(calldata)` | Extract `{debt, interest, collateral}` from `create_inscription`/`settle` tx calldata |
| `serializeSignatureCalldata(sig)` | Serialize signature string to calldata `[len, ...parts]` |

---

### Types

All exported types from the SDK:

#### Core Protocol Types

| Type | Description |
|------|-------------|
| `Network` | `'sepolia' \| 'mainnet'` |
| `AssetType` | `'ERC20' \| 'ERC721' \| 'ERC1155' \| 'ERC4626'` |
| `InscriptionStatus` | `'open' \| 'partial' \| 'filled' \| 'repaid' \| 'liquidated' \| 'expired' \| 'cancelled'` |
| `Call` | StarkNet call object (contractAddress, entrypoint, calldata) |
| `Asset` | Token within an inscription (address, type, value, token_id) |
| `InscriptionParams` | Parameters for `create_inscription` |
| `StoredInscription` | Raw on-chain inscription data |
| `Inscription` | Parsed inscription with computed status |
| `SignedOrder` | Signed order for the matching engine |
| `BatchEntry` | Entry in a batch settle (order hash + fill BPS) |
| `TokenInfo` | Token metadata (symbol, name, decimals, addresses) |
| `StoredSignature` | Serialized signature for storage (`r:s`) |

#### API / D1 Row Types

| Type | Description |
|------|-------------|
| `InscriptionRow` | Inscription row (includes `auction_started`, `auction_start_time`) |
| `InscriptionDetailResponse` | Detail response extending InscriptionRow |
| `AssetRow` | Asset row (`debt` / `interest` / `collateral`) |
| `ApiListResponse<T>` | Paginated list response envelope |
| `ApiDetailResponse<T>` | Single item response envelope |
| `TreasuryAsset` | Treasury asset balance |
| `ShareBalance` | Share balance for an account |
| `LockerInfo` | Locker information |
| `OrderStatus` | `'pending' \| 'matched' \| 'settled' \| 'expired' \| 'cancelled'` |
| `OrderRow` | Off-chain order row from D1 |
| `OrderOfferRow` | Lender offer row from D1 |
| `CollectionOfferRow` | Collection-wide offer row from D1 |
| `RefinanceRow` | Refinance offer row from D1 |
| `RenegotiationRow` | Renegotiation proposal row from D1 |
| `CollateralSaleRow` | Collateral sale offer row from D1 |
| `ShareListingRow` | Secondary market share listing row |

#### Order Book Types

| Type | Description |
|------|-------------|
| `LendingLevel` | Price level in lending order book (APR, amount, orders) |
| `SwapLevel` | Price level in swap order book (rate, amount, orders) |
| `TokenDisplay` | Token display info (address, symbol, decimals, logoUrl) |
| `OrderBookResponse` | Full order book response (pair, lending, swaps, recentFills) |
| `DurationFilter` | `'all' \| '7d' \| '30d' \| '90d' \| '180d' \| '365d'` |

#### Status & UI Types

| Type | Description |
|------|-------------|
| `EnrichedStatus` | `InscriptionStatus \| 'overdue' \| 'grace_period' \| 'auctioned'` |
| `StatusBadgeVariant` | Union of all inscription + order status strings for badge rendering |
| `StatusInput` | Input for `computeStatus()` |

#### Order Parsing Types

| Type | Description |
|------|-------------|
| `SerializedAsset` | Asset in order_data JSON (string values) |
| `RawOrderData` | Flexible order_data with camelCase/snake_case variants |
| `ParsedOrderData` | Normalized order data output |
| `StoredAsset` | Asset shape for calldata serialization |

#### Preset Types

| Type | Description |
|------|-------------|
| `DeadlinePreset` | `{ label: string, seconds: number }` |
| `DurationPreset` | `{ label: string, seconds: number }` |

#### Event Types

| Type | Description |
|------|-------------|
| `RawEvent` | Raw StarkNet event (keys, data, tx_hash, block) |
| `StelaEvent` | Discriminated union of all protocol events |
| `InscriptionCreatedEvent` | InscriptionCreated event |
| `InscriptionSignedEvent` | InscriptionSigned event |
| `InscriptionCancelledEvent` | InscriptionCancelled event |
| `InscriptionRepaidEvent` | InscriptionRepaid event |
| `InscriptionLiquidatedEvent` | InscriptionLiquidated event |
| `SharesRedeemedEvent` | SharesRedeemed event |
| `TransferSingleEvent` | ERC1155 TransferSingle event |
| `OrderSettledEvent` | OrderSettled event |
| `OrderFilledEvent` | OrderFilled event |
| `OrderCancelledEvent` | OrderCancelled event |
| `OrdersBulkCancelledEvent` | OrdersBulkCancelled event |
| `AuctionStartedEvent` | AuctionStarted event |
| `AuctionBidEvent` | AuctionBid event |

#### Client Types

| Type | Description |
|------|-------------|
| `LockerState` | Locker address + unlock status |
| `LockerCall` | Call to execute through a locker |
| `InscriptionClientOptions` | Options for InscriptionClient |
| `ShareClientOptions` | Options for ShareClient |
| `ApiClientOptions` | Options for ApiClient |
| `ListInscriptionsParams` | Parameters for `listInscriptions()` |
| `InscriptionEventRow` | API response row for events |
| `StelaSdkOptions` | Options for StelaSdk |
| `AssetValue` | Asset with proportional value |
| `AccruedInterestEntry` | Interest with full + accrued amounts |
| `PositionValue` | Full position valuation result |

---

### Constants

#### Protocol

| Export | Description |
|--------|-------------|
| `STELA_ADDRESS` | Contract addresses per network (`{ sepolia, mainnet }`) |
| `resolveNetwork(raw?)` | Validate/default network string |
| `CHAIN_ID` | SNIP-12 chain ID shortstrings per network |
| `EXPLORER_TX_URL` | Block explorer base URLs per network |
| `MAX_BPS` | `10_000n` (100% in basis points) |
| `VIRTUAL_SHARE_OFFSET` | `1e16n` (share calculation offset) |
| `ASSET_TYPE_ENUM` | AssetType to numeric enum mapping |
| `ASSET_TYPE_NAMES` | Numeric enum to AssetType mapping |
| `GRACE_PERIOD` | `86400n` — 24h grace before auction |
| `AUCTION_DURATION` | `86400n` — 24h Dutch auction |
| `AUCTION_PENALTY_BPS` | `500n` — 5% penalty at auction start |
| `AUCTION_RESERVE_BPS` | `1000n` — 10% auction floor |
| `DEFAULT_DUST_BUFFER_SECONDS` | `60n` — dust buffer for position floor |

#### Status

| Export | Description |
|--------|-------------|
| `VALID_STATUSES` | Array of all valid inscription statuses |
| `STATUS_LABELS` | Human-readable inscription status labels |
| `ORDER_STATUS_LABELS` | Human-readable order status labels |
| `INSCRIPTION_STATUS_GROUPS` | Status → filter group mapping (`open`/`active`/`closed`) |
| `ORDER_STATUS_GROUPS` | Order status → filter group mapping |
| `STATUS_DESCRIPTIONS` | Detailed tooltip text for each status |
| `CONCEPT_DESCRIPTIONS` | Help text for protocol concepts (debt, interest, collateral, etc.) |

#### Trade Presets

| Export | Description |
|--------|-------------|
| `SWAP_DEADLINE_PRESETS` | `DeadlinePreset[]` — 5m to 30d |
| `LEND_DEADLINE_PRESETS` | `DeadlinePreset[]` — 7d to 90d |
| `DURATION_PRESETS` | `DurationPreset[]` — 1d to 1y |
| `DURATION_RANGES` | `Record<DurationFilter, [min, max] \| null>` — filter to seconds mapping |

### Classes

| Export | Description |
|--------|-------------|
| `ApiError` | Error class thrown by ApiClient on HTTP failures |

### ABIs

The package ships raw ABI JSON files in `src/abi/`:

| File | Contents |
|------|----------|
| `src/abi/stela.json` | Full Stela protocol ABI (IStelaProtocol + ERC1155 + Ownable) |
| `src/abi/erc20.json` | Minimal ERC20 ABI (approve, balanceOf, allowance) |
| `src/abi/locker.json` | Locker account ABI (__execute__, is_unlocked) |

## Development

```bash
pnpm install
pnpm build        # Build with tsup (ESM + CJS)
pnpm test         # Run tests with vitest
pnpm test:watch   # Watch mode
pnpm lint         # Type-check with tsc --noEmit
```

## Publishing

```bash
pnpm build
npm publish --access public
```

## Running a Relayer

The Stela protocol is fully permissionless — anyone can run a relayer to settle matched orders and earn **0.05%** on every settlement. See [RELAYER.md](RELAYER.md) for the SDK integration guide and the [stela-relayer](https://github.com/fepvenancio/stela-relayer) repo for a standalone implementation.

## License

MIT
