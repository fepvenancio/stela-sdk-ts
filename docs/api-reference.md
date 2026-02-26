# API Reference

Complete reference for every exported function, class, type, and constant in `@fepvenancio/stela-sdk`.

---

## Table of Contents

- [Clients](#clients)
  - [StelaSdk](#stelasdk)
  - [InscriptionClient](#inscriptionclient)
  - [ShareClient](#shareclient)
  - [LockerClient](#lockerclient)
  - [ApiClient](#apiclient)
  - [ApiError](#apierror)
  - [Matching Engine (ABI-only)](#matching-engine-abi-only-no-sdk-wrappers-yet)
- [Constants](#constants)
  - [STELA_ADDRESS](#stela_address)
  - [resolveNetwork](#resolvenetwork)
  - [MAX_BPS](#max_bps)
  - [VIRTUAL_SHARE_OFFSET](#virtual_share_offset)
  - [ASSET_TYPE_ENUM](#asset_type_enum)
  - [ASSET_TYPE_NAMES](#asset_type_names)
- [Math](#math)
  - [convertToShares](#converttoshares)
  - [scaleByPercentage](#scalebypercentage)
  - [sharesToPercentage](#sharestopercentage)
  - [calculateFeeShares](#calculatefeeshares)
- [Events](#events)
  - [SELECTORS](#selectors)
  - [parseEvent](#parseevent)
  - [parseEvents](#parseevents)
- [Off-Chain (SNIP-12)](#off-chain-snip-12)
  - [getInscriptionOrderTypedData](#getinscriptionordertypeddata)
  - [getLendOfferTypedData](#getlendoffertypeddata)
  - [hashAssets](#hashassets)
  - [serializeSignature](#serializesignature)
  - [deserializeSignature](#deserializesignature)
- [Tokens](#tokens)
  - [TOKENS](#tokens-1)
  - [getTokensForNetwork](#gettokensfornetwork)
  - [findTokenByAddress](#findtokenbyaddress)
- [Utilities](#utilities)
  - [toU256](#tou256)
  - [fromU256](#fromu256)
  - [inscriptionIdToHex](#inscriptionidtohex)
  - [toHex](#tohex)
  - [formatAddress](#formataddress)
  - [normalizeAddress](#normalizeaddress)
  - [addressesEqual](#addressesequal)
  - [parseAmount](#parseamount)
  - [formatTokenValue](#formattokenvalue)
  - [formatDuration](#formatduration)
  - [formatTimestamp](#formattimestamp)
  - [computeStatus](#computestatus)
- [Types](#types)

---

## Clients

### StelaSdk

Main SDK facade that wires together all clients.

```ts
import { StelaSdk } from '@fepvenancio/stela-sdk'

const sdk = new StelaSdk(opts: StelaSdkOptions)
```

**`StelaSdkOptions`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `RpcProvider` | Yes | StarkNet RPC provider |
| `account` | `Account` | No | Connected account for write operations |
| `network` | `Network \| string` | No | `"sepolia"` or `"mainnet"`. Defaults to `"sepolia"` |
| `apiBaseUrl` | `string` | No | Custom API base URL. Defaults to `"https://stela-dapp.xyz/api"` |
| `stelaAddress` | `string` | No | Override the contract address (for custom deployments) |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `inscriptions` | `InscriptionClient` | Client for inscription read/write operations |
| `shares` | `ShareClient` | Client for ERC1155 share balance queries |
| `locker` | `LockerClient` | Client for collateral locker operations |
| `api` | `ApiClient` | HTTP client for the Stela indexer API |
| `network` | `Network` | Resolved network (`"sepolia"` or `"mainnet"`) |
| `stelaAddress` | `string` | Resolved Stela contract address |

---

### InscriptionClient

Client for reading inscription data from the on-chain contract and building/executing protocol transactions.

```ts
import { InscriptionClient } from '@fepvenancio/stela-sdk'

const client = new InscriptionClient(opts: InscriptionClientOptions)
```

**`InscriptionClientOptions`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stelaAddress` | `string` | Yes | Stela protocol contract address |
| `provider` | `RpcProvider` | Yes | StarkNet RPC provider |
| `account` | `Account` | No | Connected account for write operations |

#### Read Methods

**`getInscription(inscriptionId: bigint): Promise<StoredInscription>`**

Read a stored inscription from the contract.

```ts
const inscription = await client.getInscription(1n)
// { borrower, lender, duration, deadline, signed_at, issued_debt_percentage,
//   is_repaid, liquidated, multi_lender, debt_asset_count, interest_asset_count,
//   collateral_asset_count }
```

**`getLocker(inscriptionId: bigint): Promise<string>`**

Get the locker (TBA) contract address for an inscription.

```ts
const lockerAddress = await client.getLocker(1n)
```

**`getInscriptionFee(): Promise<bigint>`**

Get the current inscription creation fee.

```ts
const fee = await client.getInscriptionFee() // bigint
```

**`convertToShares(inscriptionId: bigint, percentage: bigint): Promise<bigint>`**

Call the on-chain `convert_to_shares` function for an inscription.

```ts
const shares = await client.convertToShares(1n, 5000n) // 50% -> shares
```

**`getNonce(address: string): Promise<bigint>`**

Get the current nonce for an address (used in off-chain signing).

```ts
const nonce = await client.getNonce('0xADDRESS')
```

**`getRelayerFee(): Promise<bigint>`**

Get the current relayer fee for off-chain settlement.

```ts
const fee = await client.getRelayerFee()
```

#### Call Builders

All `build*` methods return a `Call` object (`{ contractAddress, entrypoint, calldata }`) without executing anything. Use these to compose multi-call transactions or integrate with custom execution flows.

**`buildCreateInscription(params: InscriptionParams): Call`**

Build calldata for creating a new inscription.

```ts
const call = client.buildCreateInscription({
  is_borrow: true,
  debt_assets: [{ asset_address: '0x...', asset_type: 'ERC20', value: 1000000n, token_id: 0n }],
  interest_assets: [],
  collateral_assets: [],
  duration: 604800n,
  deadline: 1735689600n,
  multi_lender: false,
})
```

**`buildSignInscription(inscriptionId: bigint, bps: bigint): Call`**

Build calldata for signing (lending to) an inscription. `bps` is the percentage in basis points (10000 = 100%).

```ts
const call = client.buildSignInscription(1n, 10000n)
```

**`buildCancelInscription(inscriptionId: bigint): Call`**

Build calldata for cancelling an unsigned inscription.

```ts
const call = client.buildCancelInscription(1n)
```

**`buildRepay(inscriptionId: bigint): Call`**

Build calldata for repaying a loan.

```ts
const call = client.buildRepay(1n)
```

**`buildLiquidate(inscriptionId: bigint): Call`**

Build calldata for liquidating an expired loan.

```ts
const call = client.buildLiquidate(1n)
```

**`buildRedeem(inscriptionId: bigint, shares: bigint): Call`**

Build calldata for redeeming ERC1155 shares.

```ts
const call = client.buildRedeem(1n, 500n)
```

**`buildSettle(params): Call`**

Build calldata for settling an off-chain order+offer pair on-chain. This is used by relayers.

```ts
const call = client.buildSettle({
  order: {
    borrower: '0x...',
    debtHash: '0x...',
    interestHash: '0x...',
    collateralHash: '0x...',
    debtCount: 1,
    interestCount: 0,
    collateralCount: 1,
    duration: 604800n,
    deadline: 1735689600n,
    multiLender: false,
    nonce: 0n,
  },
  debtAssets: [...],
  interestAssets: [...],
  collateralAssets: [...],
  borrowerSig: ['0xR', '0xS'],
  offer: {
    orderHash: '0x...',
    lender: '0x...',
    issuedDebtPercentage: 10000n,
    nonce: 0n,
  },
  lenderSig: ['0xR', '0xS'],
})
```

**`buildSettle` params type:**

| Field | Type | Description |
|-------|------|-------------|
| `order.borrower` | `string` | Borrower address |
| `order.debtHash` | `string` | Poseidon hash of debt assets |
| `order.interestHash` | `string` | Poseidon hash of interest assets |
| `order.collateralHash` | `string` | Poseidon hash of collateral assets |
| `order.debtCount` | `number` | Number of debt assets |
| `order.interestCount` | `number` | Number of interest assets |
| `order.collateralCount` | `number` | Number of collateral assets |
| `order.duration` | `bigint` | Loan duration in seconds |
| `order.deadline` | `bigint` | Order deadline as unix timestamp |
| `order.multiLender` | `boolean` | Whether multiple lenders can fill the order |
| `order.nonce` | `bigint` | Borrower's nonce |
| `debtAssets` | `Asset[]` | Full debt asset array |
| `interestAssets` | `Asset[]` | Full interest asset array |
| `collateralAssets` | `Asset[]` | Full collateral asset array |
| `borrowerSig` | `string[]` | Borrower's SNIP-12 signature `[r, s]` |
| `offer.orderHash` | `string` | Hash of the order being accepted |
| `offer.lender` | `string` | Lender address |
| `offer.issuedDebtPercentage` | `bigint` | Percentage of debt being filled (basis points) |
| `offer.nonce` | `bigint` | Lender's nonce |
| `lenderSig` | `string[]` | Lender's SNIP-12 signature `[r, s]` |

#### Execute Methods

All execute methods require an `Account` to be provided in the constructor options. They return `Promise<{ transaction_hash: string }>`.

**`execute(calls: Call[]): Promise<{ transaction_hash: string }>`**

Execute one or more calls via the connected account. Use this to send custom call arrays.

**`createInscription(params: InscriptionParams, approvals?: Call[]): Promise<{ transaction_hash: string }>`**

Create a new inscription. Optional `approvals` (e.g. ERC20 approve calls) are bundled atomically in the same transaction.

**`signInscription(inscriptionId: bigint, bps: bigint, approvals?: Call[]): Promise<{ transaction_hash: string }>`**

Sign (lend to) an inscription. Optional `approvals` bundled atomically.

**`cancelInscription(inscriptionId: bigint): Promise<{ transaction_hash: string }>`**

Cancel an unsigned inscription.

**`repay(inscriptionId: bigint, approvals?: Call[]): Promise<{ transaction_hash: string }>`**

Repay a loan. Optional `approvals` bundled atomically.

**`liquidate(inscriptionId: bigint): Promise<{ transaction_hash: string }>`**

Liquidate an expired loan.

**`redeem(inscriptionId: bigint, shares: bigint): Promise<{ transaction_hash: string }>`**

Redeem ERC1155 shares after a loan is repaid or liquidated.

---

### Matching Engine (ABI-only, no SDK wrappers yet)

The Stela contract ABI includes a matching-engine module with three additional entry points. These functions are present in the on-chain ABI (`src/abi/stela.json`) but **do not yet have client wrappers** in the SDK. SDK wrappers and a `SignedOrder` TypeScript type are planned for a future release. In the meantime, advanced integrators can invoke these functions via raw calldata using `InscriptionClient.execute()` or directly through starknet.js.

#### `SignedOrder` struct (ABI)

The `SignedOrder` struct (`stela::types::signed_order::SignedOrder`) is used by all three entry points:

| Field | ABI Type | Description |
|-------|----------|-------------|
| `maker` | `ContractAddress` | Address of the order creator (the lender offering to fill) |
| `allowed_taker` | `ContractAddress` | Restrict who can fill against this order (`0x0` = anyone) |
| `inscription_id` | `u256` | ID of the inscription this order targets |
| `bps` | `u256` | Basis points of debt the maker is willing to fill |
| `deadline` | `u64` | Unix timestamp after which the order expires |
| `nonce` | `felt252` | Maker's nonce (for replay protection and bulk cancellation) |
| `min_fill_bps` | `u256` | Minimum basis points a taker must fill in a single transaction |

#### `fill_signed_order`

Fill a maker's signed order on their behalf. The caller (taker) provides the maker's SNIP-12 signature and specifies how many basis points to fill.

**ABI signature:**

```
fn fill_signed_order(
    order: SignedOrder,
    signature: Array<felt252>,
    fill_bps: u256,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `order` | `SignedOrder` | The signed order struct |
| `signature` | `Array<felt252>` | Maker's SNIP-12 signature `[r, s]` |
| `fill_bps` | `u256` | Basis points to fill in this transaction (must be >= `order.min_fill_bps`) |

**Raw calldata example:**

```ts
const call: Call = {
  contractAddress: stelaAddress,
  entrypoint: 'fill_signed_order',
  calldata: [
    order.maker,
    order.allowed_taker,
    ...toU256(order.inscription_id),
    ...toU256(order.bps),
    String(order.deadline),
    String(order.nonce),
    ...toU256(order.min_fill_bps),
    // signature array
    String(signature.length),
    ...signature,
    // fill_bps
    ...toU256(fillBps),
  ],
}
await client.execute([...approvalCalls, call])
```

#### `cancel_order`

Cancel a specific signed order. Only the order's `maker` can cancel. This marks the order hash as used so it cannot be filled.

**ABI signature:**

```
fn cancel_order(order: SignedOrder)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `order` | `SignedOrder` | The order to cancel (must match the original signed fields exactly) |

**Raw calldata example:**

```ts
const call: Call = {
  contractAddress: stelaAddress,
  entrypoint: 'cancel_order',
  calldata: [
    order.maker,
    order.allowed_taker,
    ...toU256(order.inscription_id),
    ...toU256(order.bps),
    String(order.deadline),
    String(order.nonce),
    ...toU256(order.min_fill_bps),
  ],
}
await client.execute([call])
```

#### `cancel_orders_by_nonce`

Bulk-cancel all orders with a nonce lower than `min_nonce`. This is a gas-efficient way to invalidate many outstanding orders at once.

**ABI signature:**

```
fn cancel_orders_by_nonce(min_nonce: felt252)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `min_nonce` | `felt252` | New minimum nonce. All orders signed with a nonce below this value become invalid. |

**Raw calldata example:**

```ts
const call: Call = {
  contractAddress: stelaAddress,
  entrypoint: 'cancel_orders_by_nonce',
  calldata: [String(newMinNonce)],
}
await client.execute([call])
```

> **Note:** SDK wrappers (`buildFillSignedOrder`, `buildCancelOrder`, `buildCancelOrdersByNonce`) and a TypeScript `SignedOrder` type will be added in a future release.

---

### ShareClient

Client for reading ERC1155 share balances on the Stela contract. Inscription IDs are token IDs -- each lender receives shares as ERC1155 tokens.

```ts
import { ShareClient } from '@fepvenancio/stela-sdk'

const client = new ShareClient(opts: ShareClientOptions)
```

**`ShareClientOptions`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stelaAddress` | `string` | Yes | Stela protocol contract address |
| `provider` | `RpcProvider` | Yes | StarkNet RPC provider |

**`balanceOf(account: string, inscriptionId: bigint): Promise<bigint>`**

Get share balance for an account on a specific inscription.

```ts
const shares = await client.balanceOf('0xLENDER', 1n)
```

**`balanceOfBatch(accounts: string[], inscriptionIds: bigint[]): Promise<bigint[]>`**

Get share balances for multiple account/inscription pairs. Arrays must have the same length.

```ts
const balances = await client.balanceOfBatch(['0xA', '0xB'], [1n, 2n])
```

**`isApprovedForAll(owner: string, operator: string): Promise<boolean>`**

Check if an operator is approved for all tokens of an owner.

```ts
const approved = await client.isApprovedForAll('0xOWNER', '0xOPERATOR')
```

---

### LockerClient

Client for interacting with collateral locker accounts (Token Bound Accounts). Provides read methods for locker state and balances, and governance execution methods for executing calls through the locker.

> Note: `LockerClient` is constructed internally by `StelaSdk`. It takes `(stelaContract, provider, account?)` as constructor arguments rather than an options object.

**`getLockerAddress(inscriptionId: bigint): Promise<string>`**

Get the Locker TBA address for an inscription.

```ts
const address = await sdk.locker.getLockerAddress(1n)
```

**`isUnlocked(inscriptionId: bigint): Promise<boolean>`**

Check if a locker is unlocked (restrictions removed after repayment/liquidation).

```ts
const unlocked = await sdk.locker.isUnlocked(1n)
```

**`getLockerState(inscriptionId: bigint): Promise<LockerState>`**

Get the full locker state (address and unlock status).

```ts
const state = await sdk.locker.getLockerState(1n)
// { address: "0x...", isUnlocked: false }
```

**`getLockerBalance(inscriptionId: bigint, tokenAddress: string): Promise<bigint>`**

Read an ERC20 balance held by a locker.

```ts
const balance = await sdk.locker.getLockerBalance(1n, '0xTOKEN')
```

**`getLockerBalances(inscriptionId: bigint, tokenAddresses: string[]): Promise<Map<string, bigint>>`**

Read multiple ERC20 balances held by a locker.

```ts
const balances = await sdk.locker.getLockerBalances(1n, ['0xTOKEN_A', '0xTOKEN_B'])
// Map { '0xTOKEN_A' => 1000000n, '0xTOKEN_B' => 500n }
```

**`buildLockerExecute(lockerAddress: string, innerCalls: Call[]): Call`**

Build a `Call` to execute arbitrary calls through the Locker TBA. The Locker uses SNIP-6 account standard (`__execute__`). This is how a DAO retains governance power over locked collateral tokens (e.g. voting with locked governance tokens).

```ts
const voteCall: Call = {
  contractAddress: '0xGOVERNANCE_TOKEN',
  entrypoint: 'vote',
  calldata: ['1'],  // proposal ID
}
const lockerCall = sdk.locker.buildLockerExecute('0xLOCKER', [voteCall])
```

**`executeThrough(inscriptionId: bigint, innerCall: Call): Promise<{ transaction_hash: string }>`**

Execute a single governance call through the Locker. Requires account to be the inscription's borrower.

```ts
const { transaction_hash } = await sdk.locker.executeThrough(1n, voteCall)
```

**`executeThroughBatch(inscriptionId: bigint, innerCalls: Call[]): Promise<{ transaction_hash: string }>`**

Execute multiple governance calls through the Locker in a single transaction.

```ts
const { transaction_hash } = await sdk.locker.executeThroughBatch(1n, [voteCall, delegateCall])
```

---

### ApiClient

HTTP client for the Stela indexer API. Provides typed access to indexed inscription data, treasury views, share balances, and locker info.

```ts
import { ApiClient } from '@fepvenancio/stela-sdk'

const api = new ApiClient(opts?: ApiClientOptions)
```

**`ApiClientOptions`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | `string` | No | API base URL. Defaults to `"https://stela-dapp.xyz/api"` |

**`listInscriptions(params?: ListInscriptionsParams): Promise<ApiListResponse<InscriptionRow>>`**

List inscriptions with optional filters.

```ts
const result = await api.listInscriptions({ status: 'open', page: 1, limit: 20 })
// { data: InscriptionRow[], meta: { page, limit, total } }
```

**`ListInscriptionsParams`**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Filter by status |
| `address` | `string` | Filter by address (borrower or lender) |
| `page` | `number` | Page number |
| `limit` | `number` | Results per page |

**`getInscription(id: string): Promise<ApiDetailResponse<InscriptionRow>>`**

Get a single inscription by ID.

```ts
const { data } = await api.getInscription('0x01')
```

**`getInscriptionEvents(id: string): Promise<ApiListResponse<InscriptionEventRow>>`**

Get events for a specific inscription.

```ts
const { data } = await api.getInscriptionEvents('0x01')
```

**`getTreasuryView(address: string): Promise<ApiListResponse<TreasuryAsset>>`**

Get treasury asset balances for an address.

```ts
const { data } = await api.getTreasuryView('0xADDRESS')
```

**`getLockers(address: string): Promise<ApiListResponse<LockerInfo>>`**

Get locker info for inscriptions of an address.

```ts
const { data } = await api.getLockers('0xADDRESS')
```

**`getShareBalances(address: string): Promise<ApiListResponse<ShareBalance>>`**

Get share balances for an address.

```ts
const { data } = await api.getShareBalances('0xADDRESS')
```

---

### ApiError

Error class thrown by `ApiClient` when an HTTP request fails.

```ts
import { ApiError } from '@fepvenancio/stela-sdk'
```

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `status` | `number` | HTTP status code |
| `message` | `string` | Error message |
| `url` | `string` | The URL that failed |
| `name` | `string` | Always `"ApiError"` |

---

## Constants

### STELA_ADDRESS

```ts
const STELA_ADDRESS: Record<Network, string>
```

Deployed Stela protocol contract addresses per network.

| Network | Address |
|---------|---------|
| `sepolia` | `0x006885f85de0e79efc7826e2ca19ef8a13e5e4516897ad52dc505723f8ce6b90` |
| `mainnet` | `0x0` (not yet deployed) |

### resolveNetwork

```ts
function resolveNetwork(raw?: string): Network
```

Validate and return a `Network` value. Falls back to `"sepolia"` if the input is invalid or omitted.

```ts
resolveNetwork('sepolia')  // 'sepolia'
resolveNetwork('mainnet')  // 'mainnet'
resolveNetwork('invalid')  // 'sepolia' (with console warning)
resolveNetwork()           // 'sepolia'
```

### MAX_BPS

```ts
const MAX_BPS: bigint = 10_000n
```

Maximum basis points representing 100%.

### VIRTUAL_SHARE_OFFSET

```ts
const VIRTUAL_SHARE_OFFSET: bigint = 10_000_000_000_000_000n  // 1e16
```

Virtual share offset used in share math calculations. Matches the Cairo contract's constant.

### ASSET_TYPE_ENUM

```ts
const ASSET_TYPE_ENUM: Record<AssetType, number>
```

Numeric enum values for asset types (matches the Cairo contract).

| AssetType | Value |
|-----------|-------|
| `ERC20` | `0` |
| `ERC721` | `1` |
| `ERC1155` | `2` |
| `ERC4626` | `3` |

### ASSET_TYPE_NAMES

```ts
const ASSET_TYPE_NAMES: Record<number, AssetType>
```

Reverse mapping from numeric enum value to `AssetType` name.

---

## Math

Pure BigInt functions for share calculations. These mirror the on-chain math in the Cairo contract.

### convertToShares

```ts
function convertToShares(
  percentage: bigint,
  totalSupply: bigint,
  currentIssuedPercentage: bigint,
): bigint
```

Convert a fill percentage to shares, matching the contract's share math.

**Formula:** `percentage * (totalSupply + VIRTUAL_SHARE_OFFSET) / max(currentIssuedPercentage, 1)`

```ts
const shares = convertToShares(5000n, 0n, 0n)
```

### scaleByPercentage

```ts
function scaleByPercentage(value: bigint, percentage: bigint): bigint
```

Scale a value by a percentage in basis points.

**Formula:** `value * percentage / MAX_BPS`

```ts
scaleByPercentage(1000000n, 5000n)  // 500000n (50%)
```

### sharesToPercentage

```ts
function sharesToPercentage(
  shares: bigint,
  totalSupply: bigint,
  currentIssuedPercentage: bigint,
): bigint
```

Convert shares back to a percentage of the inscription.

**Formula:** `shares * max(currentIssuedPercentage, 1) / (totalSupply + VIRTUAL_SHARE_OFFSET)`

```ts
const pct = sharesToPercentage(shares, totalSupply, issuedPct)
```

### calculateFeeShares

```ts
function calculateFeeShares(shares: bigint, feeBps: bigint): bigint
```

Calculate the fee portion of shares given a fee in basis points.

**Formula:** `shares * feeBps / MAX_BPS`

```ts
calculateFeeShares(10000n, 250n)  // 250n (2.5% fee)
```

---

## Events

### SELECTORS

```ts
const SELECTORS: {
  InscriptionCreated: string
  InscriptionSigned: string
  InscriptionCancelled: string
  InscriptionRepaid: string
  InscriptionLiquidated: string
  SharesRedeemed: string
  TransferSingle: string
}
```

Pre-computed event selectors (StarkNet selector hashes) for all Stela protocol events. Computed using `hash.getSelectorFromName()` from `starknet.js`.

### parseEvent

```ts
function parseEvent(raw: RawEvent): StelaEvent | null
```

Parse a single raw StarkNet event into a typed `StelaEvent`. Returns `null` if the event selector is not recognized.

```ts
const event = parseEvent(rawEvent)
if (event?.type === 'InscriptionCreated') {
  console.log(event.inscription_id, event.creator)
}
```

### parseEvents

```ts
function parseEvents(rawEvents: RawEvent[]): StelaEvent[]
```

Parse an array of raw events, skipping unrecognized ones.

```ts
const events = parseEvents(rawEventsFromRpc)
```

---

## Off-Chain (SNIP-12)

Functions for building SNIP-12 typed data for gasless off-chain signing, Poseidon asset hashing, and signature serialization.

### getInscriptionOrderTypedData

```ts
function getInscriptionOrderTypedData(params: {
  borrower: string
  debtAssets: Asset[]
  interestAssets: Asset[]
  collateralAssets: Asset[]
  debtCount: number
  interestCount: number
  collateralCount: number
  duration: bigint
  deadline: bigint
  multiLender: boolean
  nonce: bigint
  chainId: string
}): TypedData
```

Build SNIP-12 `TypedData` for a borrower's `InscriptionOrder`. The borrower signs this off-chain to create an order without gas. The domain separator uses name `"Stela"`, version `"v1"`, and revision `"1"`.

Asset arrays are hashed with `hashAssets()` and included as felt values in the message.

```ts
const typedData = getInscriptionOrderTypedData({
  borrower: '0x...',
  debtAssets: [...],
  interestAssets: [...],
  collateralAssets: [...],
  debtCount: 1,
  interestCount: 1,
  collateralCount: 1,
  duration: 604800n,
  deadline: 1735689600n,
  multiLender: false,
  nonce: 0n,
  chainId: 'SN_SEPOLIA',
})

const signature = await account.signMessage(typedData)
```

### getLendOfferTypedData

```ts
function getLendOfferTypedData(params: {
  orderHash: string
  lender: string
  issuedDebtPercentage: bigint
  nonce: bigint
  chainId: string
}): TypedData
```

Build SNIP-12 `TypedData` for a lender's `LendOffer`. The lender signs this off-chain to accept an order without gas.

```ts
const typedData = getLendOfferTypedData({
  orderHash: '0x...',
  lender: '0xLENDER',
  issuedDebtPercentage: 10000n,
  nonce: 0n,
  chainId: 'SN_SEPOLIA',
})

const signature = await account.signMessage(typedData)
```

### hashAssets

```ts
function hashAssets(assets: Asset[]): string
```

Hash an array of `Asset` objects using Poseidon, matching the Cairo contract's `hash_assets()` function. The hash includes the array length, and for each asset: `asset_address`, `asset_type` (as enum number), `value` (as u256 low/high), and `token_id` (as u256 low/high).

```ts
const hash = hashAssets([
  { asset_address: '0x...', asset_type: 'ERC20', value: 1000000n, token_id: 0n }
])
```

### serializeSignature

```ts
function serializeSignature(sig: string[]): StoredSignature
```

Serialize a starknet.js signature (`[r, s]`) to a `StoredSignature` object for database storage.

**`StoredSignature`:** `{ r: string, s: string }`

```ts
const stored = serializeSignature(['0xR_VALUE', '0xS_VALUE'])
// { r: '0xR_VALUE', s: '0xS_VALUE' }
```

### deserializeSignature

```ts
function deserializeSignature(stored: StoredSignature): string[]
```

Deserialize a `StoredSignature` back to a `string[]` for on-chain use.

```ts
const sig = deserializeSignature({ r: '0xR', s: '0xS' })
// ['0xR', '0xS']
```

---

## Tokens

### TOKENS

```ts
const TOKENS: TokenInfo[]
```

Curated StarkNet token list with addresses for sepolia and mainnet. Includes:

| Symbol | Name | Decimals | Networks |
|--------|------|----------|----------|
| ETH | Ether | 18 | sepolia, mainnet |
| STRK | Starknet Token | 18 | sepolia, mainnet |
| USDC | USD Coin | 6 | sepolia, mainnet |
| USDT | Tether USD | 6 | sepolia, mainnet |
| WBTC | Wrapped Bitcoin | 8 | sepolia, mainnet |
| DAI | Dai Stablecoin | 18 | mainnet |
| wstETH | Wrapped stETH | 18 | sepolia, mainnet |
| mUSDC | Mock USDC | 6 | sepolia |
| mWETH | Mock WETH | 18 | sepolia |
| mDAI | Mock DAI | 18 | sepolia |
| StelaNFT | Stela NFT | 0 | sepolia |

### getTokensForNetwork

```ts
function getTokensForNetwork(network: string): TokenInfo[]
```

Get tokens available on a specific network.

```ts
const sepoliaTokens = getTokensForNetwork('sepolia')
```

### findTokenByAddress

```ts
function findTokenByAddress(address: string): TokenInfo | undefined
```

Find a token by its address (searches across all networks). Handles different zero-padding and casing.

```ts
const token = findTokenByAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')
// { symbol: 'ETH', name: 'Ether', decimals: 18, ... }
```

---

## Utilities

### toU256

```ts
function toU256(n: bigint): [string, string]
```

Convert a `bigint` to a `[low, high]` string pair for StarkNet u256 calldata. Throws `RangeError` if the value is out of u256 range (negative or > 2^256 - 1).

```ts
toU256(1000000n)  // ['1000000', '0']
```

### fromU256

```ts
function fromU256(u: { low: bigint; high: bigint }): bigint
```

Convert a `{ low, high }` u256 object back to a `bigint`. Throws `RangeError` if low or high exceeds u128 range.

```ts
fromU256({ low: 1000000n, high: 0n })  // 1000000n
```

### inscriptionIdToHex

```ts
function inscriptionIdToHex(u: { low: bigint; high: bigint }): string
```

Convert a u256 `{ low, high }` to a `0x`-prefixed 64-character hex string. Useful for database keys.

```ts
inscriptionIdToHex({ low: 1n, high: 0n })
// '0x0000000000000000000000000000000000000000000000000000000000000001'
```

### toHex

```ts
function toHex(value: unknown): string
```

Convert any address-like value (`string`, `bigint`, `number`) to a hex string.

```ts
toHex(255n)     // '0xff'
toHex('0x1a')   // '0x1a'
toHex(16)       // '0x10'
```

### formatAddress

```ts
function formatAddress(address: unknown): string
```

Truncate an address for display. Pads the address and returns `0x1a2b...3c4d` format.

```ts
formatAddress('0x006885f85de0e79efc7826e2ca19ef8a13e5e4516897ad52dc505723f8ce6b90')
// '0x0068...6b90'
```

### normalizeAddress

```ts
function normalizeAddress(address: unknown): string
```

Normalize an address to a fully-padded, checksummed hex string using starknet.js `validateAndParseAddress` and `addAddressPadding`.

```ts
normalizeAddress('0x68...')
// '0x0000000000000000000000000000000000000000000000000000000000000068...'
```

### addressesEqual

```ts
function addressesEqual(a: unknown, b: unknown): boolean
```

Compare two addresses for equality. Handles different zero-padding and casing.

```ts
addressesEqual('0x68...', '0x0068...')  // true
```

### parseAmount

```ts
function parseAmount(humanAmount: string, decimals: number): bigint
```

Convert a human-readable amount string (e.g. `"1.5"`) to an on-chain raw value using the token's decimals.

```ts
parseAmount('1.5', 6)    // 1500000n
parseAmount('0.001', 18) // 1000000000000000n
parseAmount('', 6)       // 0n
```

### formatTokenValue

```ts
function formatTokenValue(raw: string | null, decimals: number): string
```

Format a raw token value string to a human-readable decimal string.

```ts
formatTokenValue('1500000', 6)    // '1.5'
formatTokenValue('1000000000000000000', 18)  // '1'
formatTokenValue(null, 6)         // '0'
formatTokenValue('0', 6)          // '0'
```

### formatDuration

```ts
function formatDuration(seconds: number | bigint): string
```

Format a duration in seconds to human-readable format.

```ts
formatDuration(604800n)  // '7d 0h'
formatDuration(3600n)    // '1h'
formatDuration(1800n)    // '30m'
```

### formatTimestamp

```ts
function formatTimestamp(ts: bigint): string
```

Format a unix timestamp (seconds) to a locale date/time string. Returns `"--"` for timestamp `0n`.

```ts
formatTimestamp(1700000000n)  // locale-dependent date string
formatTimestamp(0n)           // '--'
```

### computeStatus

```ts
function computeStatus(a: StatusInput, nowSeconds?: number): InscriptionStatus
```

Compute the inscription status from on-chain fields. Optionally accepts a `nowSeconds` parameter (defaults to current time).

**`StatusInput`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `signed_at` | `number \| bigint` | Yes | Timestamp when the inscription was signed |
| `duration` | `number \| bigint` | Yes | Loan duration in seconds |
| `issued_debt_percentage` | `number \| bigint` | Yes | Percentage of debt issued (basis points) |
| `is_repaid` | `boolean` | Yes | Whether the loan has been repaid |
| `liquidated` | `boolean` | Yes | Whether the loan has been liquidated |
| `deadline` | `number \| bigint` | No | Deadline timestamp for unsigned inscriptions |
| `status` | `string` | No | Existing status string (used to detect `"cancelled"`) |

**Status resolution logic:**

1. If `is_repaid` is true: `"repaid"`
2. If `liquidated` is true: `"liquidated"`
3. If `status` is `"cancelled"`: `"cancelled"`
4. If unsigned (`signed_at === 0`) and past deadline: `"expired"`
5. If unsigned: `"open"`
6. If `issued_debt_percentage < MAX_BPS`: `"partial"`
7. If signed and past `signed_at + duration`: `"expired"`
8. Otherwise: `"filled"`

```ts
computeStatus({
  signed_at: 0n,
  duration: 604800n,
  issued_debt_percentage: 0n,
  is_repaid: false,
  liquidated: false,
  deadline: 1735689600n,
})
// 'open' (if deadline hasn't passed)
```

---

## Types

### Core Types

```ts
/** Supported StarkNet networks */
type Network = 'sepolia' | 'mainnet'

/** Token standard types supported by the protocol */
type AssetType = 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC4626'

/** Possible states of an inscription */
type InscriptionStatus =
  | 'open' | 'partial' | 'filled' | 'repaid'
  | 'liquidated' | 'expired' | 'cancelled'

/** A single StarkNet call */
interface Call {
  contractAddress: string
  entrypoint: string
  calldata: string[]
}
```

### Status Constants

```ts
/** All valid inscription statuses as a readonly array */
const VALID_STATUSES: readonly InscriptionStatus[]
// ['open', 'partial', 'filled', 'repaid', 'liquidated', 'expired', 'cancelled']

/** Human-readable labels for each status */
const STATUS_LABELS: Record<InscriptionStatus, string>
// { open: 'Open', partial: 'Partial', filled: 'Filled', ... }
```

### Inscription Types

```ts
/** An asset within an inscription (matches Cairo Asset struct) */
interface Asset {
  asset_address: string
  asset_type: AssetType
  value: bigint        // Token amount (ERC20/ERC1155/ERC4626)
  token_id: bigint     // Token ID (ERC721/ERC1155)
}

/** Parameters for creating a new inscription */
interface InscriptionParams {
  is_borrow: boolean
  debt_assets: Asset[]
  interest_assets: Asset[]
  collateral_assets: Asset[]
  duration: bigint          // Duration in seconds
  deadline: bigint          // Deadline as unix timestamp
  multi_lender: boolean
}

/** Raw inscription data as stored on-chain */
interface StoredInscription {
  borrower: string
  lender: string
  duration: bigint
  deadline: bigint
  signed_at: bigint
  issued_debt_percentage: bigint
  is_repaid: boolean
  liquidated: boolean
  multi_lender: boolean
  debt_asset_count: number
  interest_asset_count: number
  collateral_asset_count: number
}

/** Parsed inscription with computed status and ID */
interface Inscription extends StoredInscription {
  id: string
  status: InscriptionStatus
}
```

### API Types

```ts
/** Row from the /api/inscriptions endpoint */
interface InscriptionRow {
  id: string
  creator: string
  borrower: string | null
  lender: string | null
  status: string
  issued_debt_percentage: string
  multi_lender: boolean
  duration: string
  deadline: string
  signed_at: string | null
  debt_asset_count: number
  interest_asset_count: number
  collateral_asset_count: number
  created_at_ts: string
  assets: AssetRow[]
}

/** Asset row from the inscription_assets table */
interface AssetRow {
  inscription_id: string
  asset_role: 'debt' | 'interest' | 'collateral'
  asset_index: number
  asset_address: string
  asset_type: string
  value: string | null
  token_id: string | null
}

/** Standard API list response envelope */
interface ApiListResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}

/** Standard API detail response envelope */
interface ApiDetailResponse<T> {
  data: T
}

/** Treasury asset balance info */
interface TreasuryAsset {
  asset_address: string
  asset_type: string
  balance: string
}

/** ERC1155 share balance for a lender */
interface ShareBalance {
  inscription_id: string
  holder: string
  balance: string
}

/** Locker account info */
interface LockerInfo {
  inscription_id: string
  locker_address: string
  is_unlocked: boolean
}

/** Inscription event row from the API */
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

### Event Types

```ts
/** Raw event from StarkNet RPC */
interface RawEvent {
  keys: string[]
  data: string[]
  transaction_hash: string
  block_number: number
}

/** Discriminated union of all Stela protocol events */
type StelaEvent =
  | InscriptionCreatedEvent
  | InscriptionSignedEvent
  | InscriptionCancelledEvent
  | InscriptionRepaidEvent
  | InscriptionLiquidatedEvent
  | SharesRedeemedEvent
  | TransferSingleEvent

interface InscriptionCreatedEvent {
  type: 'InscriptionCreated'
  inscription_id: bigint
  creator: string
  is_borrow: boolean
  transaction_hash: string
  block_number: number
}

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

interface InscriptionCancelledEvent {
  type: 'InscriptionCancelled'
  inscription_id: bigint
  creator: string
  transaction_hash: string
  block_number: number
}

interface InscriptionRepaidEvent {
  type: 'InscriptionRepaid'
  inscription_id: bigint
  repayer: string
  transaction_hash: string
  block_number: number
}

interface InscriptionLiquidatedEvent {
  type: 'InscriptionLiquidated'
  inscription_id: bigint
  liquidator: string
  transaction_hash: string
  block_number: number
}

interface SharesRedeemedEvent {
  type: 'SharesRedeemed'
  inscription_id: bigint
  redeemer: string
  shares: bigint
  transaction_hash: string
  block_number: number
}

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

### Locker Types

```ts
/** State of a locker account */
interface LockerState {
  address: string
  isUnlocked: boolean
}

/** A call to be executed through the locker account (extends Call) */
interface LockerCall extends Call {}
```

### Token Types

```ts
/** Token information from the registry */
interface TokenInfo {
  symbol: string
  name: string
  decimals: number
  addresses: Partial<Record<Network, string>>
  logoUrl?: string
}
```

### Offchain Types

```ts
/** Serialized signature for database storage */
interface StoredSignature {
  r: string
  s: string
}
```

### Client Option Types

```ts
interface InscriptionClientOptions {
  stelaAddress: string
  provider: RpcProvider
  account?: Account
}

interface ShareClientOptions {
  stelaAddress: string
  provider: RpcProvider
}

interface ApiClientOptions {
  baseUrl?: string
}

interface StelaSdkOptions {
  provider: RpcProvider
  account?: Account
  network?: Network | string
  apiBaseUrl?: string
  stelaAddress?: string
}

interface ListInscriptionsParams {
  status?: string
  address?: string
  page?: number
  limit?: number
}

/** Input shape for computeStatus */
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
