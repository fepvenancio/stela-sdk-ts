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
| `buildPrivateRedeem(request, proof)` | Redeem shares via the privacy pool with a ZK proof |
| `buildSettle(params)` | Settle an off-chain order (used by relayer bots) |
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
| `privateRedeem(request, proof)` | Redeem via privacy pool |
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
  hashAssets,
  serializeSignature,
  deserializeSignature,
} from '@fepvenancio/stela-sdk'
```

| Function | Description |
|----------|-------------|
| `getInscriptionOrderTypedData(params)` | Build SNIP-12 typed data for a borrower's InscriptionOrder |
| `getLendOfferTypedData(params)` | Build SNIP-12 typed data for a lender's LendOffer (supports `lenderCommitment` for privacy) |
| `hashAssets(assets)` | Poseidon hash of an asset array (matches Cairo's `hash_assets()`) |
| `serializeSignature(sig)` | Convert `string[]` signature to `{ r, s }` for storage |
| `deserializeSignature(stored)` | Convert `{ r, s }` back to `string[]` |

---

### Privacy Utilities

Functions for the privacy pool (shielded share commitments via Poseidon hashing).

```typescript
import {
  createPrivateNote,
  computeCommitment,
  computeNullifier,
  hashPair,
  generateSalt,
} from '@fepvenancio/stela-sdk'
```

| Function | Returns | Description |
|----------|---------|-------------|
| `createPrivateNote(owner, inscriptionId, shares, salt?)` | `PrivateNote` | Generate a full private note (auto-generates salt if omitted) |
| `computeCommitment(owner, inscriptionId, shares, salt)` | `string` | Compute a Poseidon commitment hash |
| `computeNullifier(commitment, ownerSecret)` | `string` | Derive a nullifier from a commitment |
| `hashPair(left, right)` | `string` | Poseidon hash of two children (Merkle tree nodes) |
| `generateSalt()` | `string` | Random felt252 salt for commitment uniqueness |

#### Types

```typescript
interface PrivateNote {
  owner: string
  inscriptionId: bigint
  shares: bigint
  salt: string
  commitment: string
}

interface PrivateRedeemRequest {
  root: string            // Merkle root the proof was generated against
  inscriptionId: bigint
  shares: bigint
  nullifier: string       // Prevents double-spend
  changeCommitment: string // For partial redemption ('0' if full)
  recipient: string
}
```

---

### Math Utilities

Share calculation helpers that mirror the on-chain math.

```typescript
import {
  convertToShares,
  scaleByPercentage,
  sharesToPercentage,
  calculateFeeShares,
} from '@fepvenancio/stela-sdk'
```

| Function | Description |
|----------|-------------|
| `convertToShares(percentage, totalSupply, currentIssuedPercentage)` | Convert fill percentage to shares |
| `scaleByPercentage(value, percentage)` | Scale a value by basis points |
| `sharesToPercentage(shares, totalSupply, currentIssuedPercentage)` | Convert shares back to percentage |
| `calculateFeeShares(shares, feeBps)` | Calculate fee portion of shares |

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

Supported event types: `InscriptionCreated`, `InscriptionSigned`, `InscriptionCancelled`, `InscriptionRepaid`, `InscriptionLiquidated`, `SharesRedeemed`, `TransferSingle`, `OrderSettled`, `OrderFilled`, `OrderCancelled`, `OrdersBulkCancelled`, `PrivateSettled`, `PrivateSharesRedeemed`.

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
  formatDuration, formatTimestamp,
  computeStatus,
} from '@fepvenancio/stela-sdk'
```

| Function | Description |
|----------|-------------|
| `toU256(value)` | Convert bigint to `[low, high]` string pair for Cairo u256 |
| `fromU256({ low, high })` | Convert Cairo u256 back to bigint |
| `inscriptionIdToHex(id)` | Format inscription ID as hex string |
| `toHex(value)` | Convert bigint/number to hex string |
| `formatAddress(address)` | Shorten an address for display (`0x1234...abcd`) |
| `normalizeAddress(address)` | Strip leading zeros for consistent comparison |
| `addressesEqual(a, b)` | Case-insensitive address comparison |
| `parseAmount(value, decimals)` | Parse human-readable amount to bigint |
| `formatTokenValue(value, decimals)` | Format bigint token value for display |
| `formatDuration(seconds)` | Format seconds as human-readable duration |
| `formatTimestamp(timestamp)` | Format unix timestamp as date string |
| `computeStatus(input)` | Derive inscription status from on-chain fields |

---

### Types

All exported types from the SDK:

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
| `InscriptionRow` | API response row for inscriptions |
| `AssetRow` | API response row for assets |
| `ApiListResponse<T>` | Paginated list response envelope |
| `ApiDetailResponse<T>` | Single item response envelope |
| `TreasuryAsset` | Treasury asset balance |
| `ShareBalance` | Share balance for an account |
| `LockerInfo` | Locker information from the API |
| `LockerState` | Locker address + unlock status |
| `LockerCall` | Call to execute through a locker |
| `StelaEvent` | Discriminated union of all protocol events |
| `PrivateNote` | Private share note for the privacy pool |
| `PrivateRedeemRequest` | Request to privately redeem shares |
| `TokenInfo` | Token metadata (symbol, name, decimals, addresses) |
| `StatusInput` | Input for `computeStatus()` |
| `StoredSignature` | Serialized signature for storage (`{ r, s }`) |

---

### Constants

| Export | Description |
|--------|-------------|
| `STELA_ADDRESS` | Contract addresses per network (`{ sepolia, mainnet }`) |
| `resolveNetwork(raw?)` | Validate/default network string |
| `MAX_BPS` | `10_000n` (100% in basis points) |
| `VIRTUAL_SHARE_OFFSET` | `1e16n` (share calculation offset) |
| `ASSET_TYPE_ENUM` | AssetType to numeric enum mapping |
| `ASSET_TYPE_NAMES` | Numeric enum to AssetType mapping |
| `VALID_STATUSES` | Array of all valid inscription statuses |
| `STATUS_LABELS` | Human-readable status labels |

### ABIs

The package ships raw ABI JSON files in `src/abi/`:

| File | Contents |
|------|----------|
| `src/abi/stela.json` | Full Stela protocol ABI (IStelaProtocol + ERC1155 + Ownable + Privacy) |
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

## License

MIT
