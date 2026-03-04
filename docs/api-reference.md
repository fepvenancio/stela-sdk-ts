# API Reference

Complete reference for every exported function, class, and constant in `@fepvenancio/stela-sdk`.

---

## Table of Contents

- [Constants](#constants)
- [Utilities](#utilities)
- [Tokens](#tokens)
- [Math](#math)
- [Events](#events)
- [Off-Chain (SNIP-12)](#off-chain-snip-12)
- [Privacy](#privacy)
- [Client Classes](#client-classes)
  - [StelaSdk](#stelasdk)
  - [InscriptionClient](#inscriptionclient)
  - [ShareClient](#shareclient)
  - [LockerClient](#lockerclient)
  - [ApiClient](#apiclient)
  - [ApiError](#apierror)
- [Accuracy Notes](#accuracy-notes)

---

## Constants

### STELA_ADDRESS

```ts
const STELA_ADDRESS: Record<Network, string>
```

| Network | Address |
|---------|---------|
| `sepolia` | `0x03e88d289b9ce13e5d6e6ca5159930f9227b08cfbd004231a09a1d6f48568973` |
| `mainnet` | `0x0` (placeholder -- not yet deployed) |

### resolveNetwork

```ts
function resolveNetwork(raw?: string): Network
```

Validate and return a `Network` value. Falls back to `'sepolia'` with a console warning if invalid.

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
// { ERC20: 0, ERC721: 1, ERC1155: 2, ERC4626: 3 }
```

### ASSET_TYPE_NAMES

```ts
const ASSET_TYPE_NAMES: Record<number, AssetType>
// { 0: 'ERC20', 1: 'ERC721', 2: 'ERC1155', 3: 'ERC4626' }
```

Reverse mapping from numeric enum value to `AssetType` name.

### VALID_STATUSES

```ts
const VALID_STATUSES: readonly InscriptionStatus[]
// ['open', 'partial', 'filled', 'repaid', 'liquidated', 'expired', 'cancelled']
```

### STATUS_LABELS

```ts
const STATUS_LABELS: Record<InscriptionStatus, string>
// { open: 'Open', partial: 'Partial', filled: 'Filled', ... }
```

---

## Utilities

### toU256

```ts
function toU256(n: bigint): [string, string]
```

Convert a `bigint` to a `[low, high]` hex string pair for StarkNet u256 calldata. Throws `RangeError` for negative values or values exceeding 2^256 - 1.

```ts
toU256(0n)    // ['0x0', '0x0']
toU256(123n)  // ['0x7b', '0x0']
```

### fromU256

```ts
function fromU256(u: { low: bigint; high: bigint }): bigint
```

Convert a `{ low, high }` u256 object back to a `bigint`. Throws `RangeError` if components exceed u128.

```ts
fromU256({ low: 123n, high: 0n })  // 123n
```

### inscriptionIdToHex

```ts
function inscriptionIdToHex(u: { low: bigint; high: bigint }): string
```

Convert a u256 to a `0x`-prefixed 64-character hex string. Useful for database keys.

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
toHex(255n)    // '0xff'
toHex('0x1a')  // '0x1a'
toHex(16)      // '0x10'
```

### formatAddress

```ts
function formatAddress(address: unknown): string
```

Truncate an address for display: `0x049d...4dc7`.

### normalizeAddress

```ts
function normalizeAddress(address: unknown): string
```

Normalize to a fully-padded, checksummed hex string (66 chars). Uses starknet.js `validateAndParseAddress` + `addAddressPadding`.

### addressesEqual

```ts
function addressesEqual(a: unknown, b: unknown): boolean
```

Compare two addresses for equality. Handles different zero-padding and casing.

```ts
addressesEqual('0x1', '0x0000...0001')  // true
```

### parseAmount

```ts
function parseAmount(humanAmount: string, decimals: number): bigint
```

Convert human-readable amount to on-chain raw value. Truncates excess fractional digits.

```ts
parseAmount('1.5', 6)    // 1500000n
parseAmount('0.001', 18) // 1000000000000000n
parseAmount('', 6)       // 0n
```

### formatTokenValue

```ts
function formatTokenValue(raw: string | null, decimals: number): string
```

Format raw token value string to human-readable. Strips trailing zeros.

```ts
formatTokenValue('1500000', 6)                // '1.5'
formatTokenValue('1000000000000000000', 18)    // '1'
formatTokenValue(null, 6)                      // '0'
```

### formatDuration

```ts
function formatDuration(seconds: number | bigint): string
```

Format seconds to human-readable: `'7d 0h'`, `'1h'`, `'30m'`.

### formatTimestamp

```ts
function formatTimestamp(ts: bigint): string
```

Format unix timestamp (seconds) to locale string. Returns `'--'` for `0n`.

### computeStatus

```ts
function computeStatus(a: StatusInput, nowSeconds?: number): InscriptionStatus
```

Compute inscription status from on-chain fields. Resolution order:

1. `is_repaid` true -> `'repaid'`
2. `liquidated` true -> `'liquidated'`
3. `status === 'cancelled'` -> `'cancelled'`
4. Unsigned (`signed_at === 0`) and past deadline -> `'expired'`
5. Unsigned -> `'open'`
6. `issued_debt_percentage < MAX_BPS` -> `'partial'`
7. Past `signed_at + duration` -> `'expired'`
8. Otherwise -> `'filled'`

---

## Tokens

### TOKENS

```ts
const TOKENS: TokenInfo[]
```

Curated StarkNet token list (11 tokens):

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

Filter tokens available on a specific network.

### findTokenByAddress

```ts
function findTokenByAddress(address: string): TokenInfo | undefined
```

Find a token by its address (searches all networks). Handles different zero-padding and casing.

---

## Math

Pure BigInt functions mirroring the on-chain share math.

### convertToShares

```ts
function convertToShares(
  percentage: bigint,
  totalSupply: bigint,
  currentIssuedPercentage: bigint,
): bigint
```

**Formula:** `percentage * (totalSupply + VIRTUAL_SHARE_OFFSET) / max(currentIssuedPercentage, 1)`

### scaleByPercentage

```ts
function scaleByPercentage(value: bigint, percentage: bigint): bigint
```

**Formula:** `value * percentage / MAX_BPS`

### sharesToPercentage

```ts
function sharesToPercentage(
  shares: bigint,
  totalSupply: bigint,
  currentIssuedPercentage: bigint,
): bigint
```

**Formula:** `shares * max(currentIssuedPercentage, 1) / (totalSupply + VIRTUAL_SHARE_OFFSET)`

### calculateFeeShares

```ts
function calculateFeeShares(shares: bigint, feeBps: bigint): bigint
```

**Formula:** `shares * feeBps / MAX_BPS`

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
  OrderSettled: string
  OrderFilled: string
  OrderCancelled: string
  OrdersBulkCancelled: string
}
```

Pre-computed event selector hashes (11 selectors). Computed via `hash.getSelectorFromName()`.

> **Note:** `PrivateSettled` and `PrivateSharesRedeemed` are NOT in `SELECTORS`. The event parser does not handle these two event types. They are defined as types (`PrivateSettledEvent`, `PrivateSharesRedeemedEvent`) and are handled by the application's indexer separately.

### parseEvent

```ts
function parseEvent(raw: RawEvent): StelaEvent | null
```

Parse a single raw StarkNet event into a typed `StelaEvent`. Returns `null` for unrecognized selectors.

### parseEvents

```ts
function parseEvents(rawEvents: RawEvent[]): StelaEvent[]
```

Parse an array of raw events, skipping unrecognized ones.

---

## Off-Chain (SNIP-12)

Functions for building SNIP-12 typed data for gasless off-chain signing.

All typed data uses the domain separator: `{ name: 'Stela', version: 'v1', chainId, revision: '1' }`.

> **Note:** `getCancelOrderTypedData` does NOT exist in the SDK. That function is defined only in the `stela-app` repo at `src/lib/offchain.ts`.

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

Build SNIP-12 `TypedData` for a borrower's `InscriptionOrder`.

**SNIP-12 struct fields:** `borrower` (ContractAddress), `debt_hash` (felt), `interest_hash` (felt), `collateral_hash` (felt), `debt_count` (u128), `interest_count` (u128), `collateral_count` (u128), `duration` (u128), `deadline` (u128), `multi_lender` (bool), `nonce` (felt).

Asset arrays are hashed with `hashAssets()` and included as felt values.

### getLendOfferTypedData

```ts
function getLendOfferTypedData(params: {
  orderHash: string
  lender: string
  issuedDebtPercentage: bigint
  nonce: bigint
  chainId: string
  lenderCommitment?: string   // default '0' (non-private)
}): TypedData
```

Build SNIP-12 `TypedData` for a lender's `LendOffer`.

**SNIP-12 struct fields:** `order_hash` (felt), `lender` (ContractAddress), `issued_debt_percentage` (u256), `nonce` (felt), `lender_commitment` (felt).

When `lenderCommitment` is non-zero, the settlement is private: shares go to the privacy pool Merkle tree instead of minting ERC1155.

### getPrivateLendOfferTypedData

```ts
function getPrivateLendOfferTypedData(params: {
  orderHash: string
  issuedDebtPercentage: bigint
  nonce: bigint
  chainId: string
  depositCommitment: string
}): TypedData
```

Convenience wrapper: calls `getLendOfferTypedData` with `lender='0x0'` and `lenderCommitment=depositCommitment`. Used for anonymous private settlements.

### hashAssets

```ts
function hashAssets(assets: Asset[]): string
```

Poseidon hash matching Cairo `hash_assets()`. Hashes: `[length, addr, type_enum, value_low, value_high, token_id_low, token_id_high, ...]`.

### serializeSignature

```ts
function serializeSignature(sig: string[]): StoredSignature
```

Convert `[r, s]` to `{ r, s }` for database storage.

### deserializeSignature

```ts
function deserializeSignature(stored: StoredSignature): string[]
```

Convert `{ r, s }` back to `[r, s]` for on-chain use.

---

## Privacy

All privacy functions use Poseidon hashing via starknet.js and match the Cairo implementations in `stela-privacy`.

### computeCommitment

```ts
function computeCommitment(
  owner: string,
  inscriptionId: bigint,
  shares: bigint,
  salt: string,            // NOTE: string type
): string
```

**Formula:** `Poseidon(STELA_COMMITMENT_V1, owner, id_low, id_high, shares_low, shares_high, salt)`

Domain separator `STELA_COMMITMENT_V1` is encoded as a StarkNet short string.

### computeDepositCommitment

```ts
function computeDepositCommitment(
  depositor: string,
  token: string,
  amount: bigint,
  salt: bigint,            // NOTE: bigint type (inconsistent with computeCommitment's string)
): string
```

**Formula:** `Poseidon(STELA_COMMITMENT_V1, depositor, token, amount_low, amount_high, salt_hex)`

> **Accuracy note:** `salt` is `bigint` here but `string` in `computeCommitment`. This is an inconsistency in the SDK.

### computeNullifier

```ts
function computeNullifier(commitment: string, ownerSecret: string): string
```

**Formula:** `Poseidon(STELA_NULLIFIER_V1, commitment, ownerSecret)`

Domain separator `STELA_NULLIFIER_V1` is encoded as a StarkNet short string.

### hashPair

```ts
function hashPair(left: string, right: string): string
```

**Formula:** `Poseidon(left, right)`

For Merkle tree internal nodes. **Order-dependent** (not commutative).

### generateSalt

```ts
function generateSalt(): string
```

Generate 31 random bytes via `crypto.getRandomValues()`, returned as a hex-encoded felt252 (always < field prime).

### createPrivateNote

```ts
function createPrivateNote(
  owner: string,
  inscriptionId: bigint,
  shares: bigint,
  salt?: string,
): PrivateNote
```

Create a full `PrivateNote`: generates a random salt if not provided, computes the commitment, returns the complete note object.

---

## Client Classes

### StelaSdk

```ts
class StelaSdk {
  readonly inscriptions: InscriptionClient
  readonly shares: ShareClient
  readonly locker: LockerClient
  readonly api: ApiClient
  readonly network: Network
  readonly stelaAddress: string
  constructor(opts: StelaSdkOptions)
}
```

Main facade. See [ARCHITECTURE.md](./ARCHITECTURE.md) for composition details.

---

### InscriptionClient

```ts
new InscriptionClient({ stelaAddress: string, provider: RpcProvider, account?: Account })
```

#### Read Methods

| Method | Signature | Returns |
|--------|-----------|---------|
| `getInscription` | `(inscriptionId: bigint)` | `Promise<StoredInscription>` |
| `getLocker` | `(inscriptionId: bigint)` | `Promise<string>` (locker address) |
| `getInscriptionFee` | `()` | `Promise<bigint>` (protocol fee in BPS, applied to lender shares on sign/settle) |
| `convertToShares` | `(inscriptionId: bigint, percentage: bigint)` | `Promise<bigint>` |
| `getNonce` | `(address: string)` | `Promise<bigint>` |
| `getRelayerFee` | `()` | `Promise<bigint>` |
| `getTreasury` | `()` | `Promise<string>` |
| `isPaused` | `()` | `Promise<boolean>` |
| `isOrderRegistered` | `(orderHash: string)` | `Promise<boolean>` |
| `isOrderCancelled` | `(orderHash: string)` | `Promise<boolean>` |
| `getFilledBps` | `(orderHash: string)` | `Promise<bigint>` |
| `getMakerMinNonce` | `(maker: string)` | `Promise<string>` |

#### Call Builders

All return `Call` objects synchronously without executing.

| Method | Signature |
|--------|-----------|
| `buildCreateInscription` | `(params: InscriptionParams): Call` |
| `buildSignInscription` | `(inscriptionId: bigint, bps: bigint): Call` |
| `buildCancelInscription` | `(inscriptionId: bigint): Call` |
| `buildRepay` | `(inscriptionId: bigint): Call` |
| `buildLiquidate` | `(inscriptionId: bigint): Call` |
| `buildRedeem` | `(inscriptionId: bigint, shares: bigint): Call` |
| `buildPrivateRedeem` | `(request: PrivateRedeemRequest, proof: string[]): Call` |
| `buildShieldDeposit` | `(params: { privacyPoolAddress, token, amount, commitment }): Call` |
| `buildSettlePrivate` | `(params): Call` -- forces lender to `'0x0'`, delegates to `buildSettle` |
| `buildSettle` | `(params): Call` -- see below |
| `buildFillSignedOrder` | `(order: SignedOrder, signature: string[], fillBps: bigint): Call` |
| `buildCancelOrder` | `(order: SignedOrder): Call` |
| `buildCancelOrdersByNonce` | `(minNonce: string): Call` |

**`buildSettle` params:**

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
| `order.multiLender` | `boolean` | Whether multiple lenders can fill |
| `order.nonce` | `bigint` | Borrower's nonce |
| `debtAssets` | `Asset[]` | Full debt asset array |
| `interestAssets` | `Asset[]` | Full interest asset array |
| `collateralAssets` | `Asset[]` | Full collateral asset array |
| `borrowerSig` | `string[]` | Borrower's SNIP-12 signature `[r, s]` |
| `offer.orderHash` | `string` | Hash of the order being accepted |
| `offer.lender` | `string` | Lender address |
| `offer.issuedDebtPercentage` | `bigint` | Percentage being filled (BPS) |
| `offer.nonce` | `bigint` | Lender's nonce |
| `offer.lenderCommitment` | `string?` | Privacy commitment. Non-zero = private settlement. Default `'0'`. |
| `lenderSig` | `string[]` | Lender's SNIP-12 signature `[r, s]` |

**`buildSettlePrivate` params:** Same as `buildSettle` but `offer` does not have `lender` (forced to `'0x0'`). `offer.lenderCommitment` is required.

#### Execute Methods

All require `account` in constructor. All return `Promise<{ transaction_hash: string }>`.

| Method | Signature |
|--------|-----------|
| `execute` | `(calls: Call[])` |
| `createInscription` | `(params: InscriptionParams, approvals?: Call[])` |
| `signInscription` | `(inscriptionId: bigint, bps: bigint, approvals?: Call[])` |
| `cancelInscription` | `(inscriptionId: bigint)` |
| `repay` | `(inscriptionId: bigint, approvals?: Call[])` |
| `liquidate` | `(inscriptionId: bigint)` |
| `redeem` | `(inscriptionId: bigint, shares: bigint)` |
| `privateRedeem` | `(request: PrivateRedeemRequest, proof: string[])` |
| `fillSignedOrder` | `(order: SignedOrder, signature: string[], fillBps: bigint, approvals?: Call[])` |
| `cancelOrder` | `(order: SignedOrder)` |
| `cancelOrdersByNonce` | `(minNonce: string)` |

---

### ShareClient

```ts
new ShareClient({ stelaAddress: string, provider: RpcProvider })
```

Read-only ERC1155 share balance queries.

| Method | Signature | Returns |
|--------|-----------|---------|
| `balanceOf` | `(account: string, inscriptionId: bigint)` | `Promise<bigint>` |
| `balanceOfBatch` | `(accounts: string[], inscriptionIds: bigint[])` | `Promise<bigint[]>` |
| `isApprovedForAll` | `(owner: string, operator: string)` | `Promise<boolean>` |

---

### LockerClient

```ts
new LockerClient(stelaContract: Contract, provider: RpcProvider, account?: Account)
```

Constructed internally by `StelaSdk`. Accesses collateral locker TBAs (Token Bound Accounts).

| Method | Signature | Returns |
|--------|-----------|---------|
| `getLockerAddress` | `(inscriptionId: bigint)` | `Promise<string>` |
| `isUnlocked` | `(inscriptionId: bigint)` | `Promise<boolean>` |
| `getLockerState` | `(inscriptionId: bigint)` | `Promise<LockerState>` |
| `getLockerBalance` | `(inscriptionId: bigint, tokenAddress: string)` | `Promise<bigint>` |
| `getLockerBalances` | `(inscriptionId: bigint, tokenAddresses: string[])` | `Promise<Map<string, bigint>>` |
| `buildLockerExecute` | `(lockerAddress: string, innerCalls: Call[])` | `Call` |
| `executeThrough` | `(inscriptionId: bigint, innerCall: Call)` | `Promise<{ transaction_hash }>` |
| `executeThroughBatch` | `(inscriptionId: bigint, innerCalls: Call[])` | `Promise<{ transaction_hash }>` |

---

### ApiClient

```ts
new ApiClient({ baseUrl?: string })
```

Default base URL: `https://stela-dapp.xyz/api`

| Method | Signature | Returns |
|--------|-----------|---------|
| `listInscriptions` | `(params?: ListInscriptionsParams)` | `Promise<ApiListResponse<InscriptionRow>>` |
| `getInscription` | `(id: string)` | `Promise<ApiDetailResponse<InscriptionRow>>` |
| `getInscriptionEvents` | `(id: string)` | `Promise<ApiListResponse<InscriptionEventRow>>` |
| `getTreasuryView` | `(address: string)` | `Promise<ApiListResponse<TreasuryAsset>>` |
| `getLockers` | `(address: string)` | `Promise<ApiListResponse<LockerInfo>>` |
| `getShareBalances` | `(address: string)` | `Promise<ApiListResponse<ShareBalance>>` |

---

### ApiError

```ts
class ApiError extends Error {
  readonly status: number
  readonly url: string
  readonly name: string  // always 'ApiError'
}
```

Thrown by `ApiClient` when an HTTP request returns a non-OK status.

---

## Accuracy Notes

These are known inconsistencies and edge cases documented for transparency:

1. **SELECTORS missing privacy events:** `PrivateSettled` and `PrivateSharesRedeemed` event selectors are not in the `SELECTORS` object. The `parseEvent()` function cannot parse these events. They are handled by the application's indexer directly.

2. **Salt type inconsistency:** `computeCommitment()` takes `salt` as `string`, while `computeDepositCommitment()` takes `salt` as `bigint`. Both produce hex strings internally.

3. **Mainnet address is placeholder:** `STELA_ADDRESS.mainnet` is `'0x0'`. The protocol is not yet deployed to mainnet.

4. **getCancelOrderTypedData is app-only:** This function does NOT exist in the SDK. It is defined only in the `stela-app` repo at `src/lib/offchain.ts`. The SDK's offchain module exports `getInscriptionOrderTypedData`, `getLendOfferTypedData`, and `getPrivateLendOfferTypedData`.

5. **getLockerBalances makes sequential RPC calls:** One `balance_of` call per token address, not batched. May be slow for many tokens.
