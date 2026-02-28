# Architecture

## Module Map

```
src/
  index.ts                        Root barrel — re-exports everything below
  abi/
    stela.json                    Stela protocol contract ABI
    erc20.json                    ERC20 standard ABI
    locker.json                   Locker TBA (Token Bound Account) ABI

  client/
    stela-sdk.ts                  StelaSdk — facade that wires all clients
    inscription-client.ts         InscriptionClient — reads + writes for inscriptions
    share-client.ts               ShareClient — ERC1155 share balance queries
    locker-client.ts              LockerClient — collateral locker reads + governance execution
    api-client.ts                 ApiClient — HTTP client for the indexer REST API

  constants/
    addresses.ts                  STELA_ADDRESS per network, resolveNetwork()
    protocol.ts                   MAX_BPS, VIRTUAL_SHARE_OFFSET, ASSET_TYPE_ENUM, ASSET_TYPE_NAMES

  events/
    selectors.ts                  SELECTORS — pre-computed event selector hashes
    parser.ts                     parseEvent(), parseEvents() — raw event -> typed StelaEvent

  math/
    shares.ts                     convertToShares, scaleByPercentage, sharesToPercentage, calculateFeeShares

  offchain/
    typed-data.ts                 getInscriptionOrderTypedData, getLendOfferTypedData, getPrivateLendOfferTypedData
    hash.ts                       hashAssets — Poseidon hash matching Cairo hash_assets()
    signature.ts                  serializeSignature, deserializeSignature, StoredSignature

  privacy/
    types.ts                      PrivateNote, PrivateRedeemRequest interfaces
    commitment.ts                 computeCommitment, computeDepositCommitment, computeNullifier, hashPair, generateSalt, createPrivateNote

  tokens/
    types.ts                      TokenInfo interface
    registry.ts                   TOKENS array, getTokensForNetwork, findTokenByAddress

  types/
    common.ts                     Network, AssetType, InscriptionStatus, Call, VALID_STATUSES, STATUS_LABELS
    inscription.ts                Asset, InscriptionParams, StoredInscription, Inscription, SignedOrder
    api.ts                        InscriptionRow, AssetRow, ApiListResponse, ApiDetailResponse, TreasuryAsset, ShareBalance, LockerInfo
    events.ts                     RawEvent, 13 event interfaces, StelaEvent union
    locker.ts                     LockerState, LockerCall

  utils/
    u256.ts                       toU256, fromU256, inscriptionIdToHex
    address.ts                    toHex, formatAddress, normalizeAddress, addressesEqual
    amount.ts                     parseAmount, formatTokenValue
    format.ts                     formatDuration, formatTimestamp
    status.ts                     computeStatus, StatusInput
```

---

## StelaSdk Facade Pattern

`StelaSdk` is the main entry point. It composes four specialized clients and resolves the network/address automatically:

```
StelaSdk
  ├── inscriptions: InscriptionClient   (contract reads + transaction builders + execution)
  ├── shares: ShareClient               (ERC1155 balance queries)
  ├── locker: LockerClient              (locker state + governance execution)
  └── api: ApiClient                    (HTTP indexer queries)
```

### Construction Flow

```ts
new StelaSdk({ provider, account?, network?, apiBaseUrl?, stelaAddress? })
```

1. `resolveNetwork(network)` validates the network string, defaults to `'sepolia'`
2. `stelaAddress` is resolved from `STELA_ADDRESS[network]` unless overridden
3. `InscriptionClient` is created with `{ stelaAddress, provider, account }`
4. `ShareClient` is created with `{ stelaAddress, provider }` (read-only)
5. `LockerClient` is created with `(Contract, provider, account)` — takes a Contract instance directly
6. `ApiClient` is created with `{ baseUrl }`, defaults to `https://stela-dapp.xyz/api`

### Client Responsibilities

**InscriptionClient** — The largest client. Three categories of methods:
- **Read methods** — call the on-chain contract via RPC (e.g. `getInscription`, `getNonce`, `isPaused`)
- **Call builders** — sync methods that return `Call` objects without executing (e.g. `buildCreateInscription`, `buildSettle`, `buildPrivateRedeem`)
- **Execute methods** — async methods that call `account.execute()` (e.g. `createInscription`, `repay`, `privateRedeem`)

**ShareClient** — Read-only ERC1155 queries: `balanceOf`, `balanceOfBatch`, `isApprovedForAll`.

**LockerClient** — Reads locker state (address, unlock status, token balances). Also builds and executes governance calls through the Locker TBA's `__execute__` entrypoint (SNIP-6 account standard).

**ApiClient** — Stateless HTTP client using `fetch()`. All methods return typed response envelopes (`ApiListResponse<T>` or `ApiDetailResponse<T>`).

---

## Build Configuration

- **Bundler:** tsup
- **Formats:** ESM (`dist/index.js`) + CJS (`dist/index.cjs`)
- **TypeScript declarations:** `dist/index.d.ts`
- **Source maps:** enabled
- **Tree-shaking:** enabled
- **External:** `starknet` (peer dependency, not bundled)
- **Entry:** single `src/index.ts`

---

## Dependency Model

```
@fepvenancio/stela-sdk
  └── peerDependency: starknet ^6.0.0
```

The SDK uses starknet.js v6 for:
- `RpcProvider` and `Account` types (passed in by the user)
- `Contract` class for on-chain reads
- `uint256` utilities for u256 conversion
- `hash.computePoseidonHashOnElements` for Poseidon hashing
- `hash.getSelectorFromName` for event selector computation
- `typedData` types for SNIP-12
- `addAddressPadding`, `validateAndParseAddress` for address normalization
- `shortString.encodeShortString` for domain separator encoding

No other runtime dependencies exist.
