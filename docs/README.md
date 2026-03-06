# Stela SDK

TypeScript SDK for the Stela P2P lending protocol on StarkNet.

**Package:** `@fepvenancio/stela-sdk`
**Version:** 0.4.0
**License:** MIT
**Peer dependency:** `starknet ^6.0.0`

---

## Installation

```bash
# npm
npm install @fepvenancio/stela-sdk starknet

# pnpm
pnpm add @fepvenancio/stela-sdk starknet
```

`starknet` (v6+) is a peer dependency and must be installed alongside the SDK.

---

## Quick Start

```ts
import { StelaSdk } from '@fepvenancio/stela-sdk'
import { RpcProvider, Account } from 'starknet'

// Set up provider and account
const provider = new RpcProvider({ nodeUrl: 'https://your-starknet-rpc' })
const account = new Account(provider, '0xYOUR_ADDRESS', '0xYOUR_PRIVATE_KEY')

// Create the SDK (wires all clients together)
const sdk = new StelaSdk({
  provider,
  account,            // optional -- omit for read-only usage
  network: 'sepolia',
})

// Read an inscription from the contract
const inscription = await sdk.inscriptions.getInscription(1n)
console.log(inscription.borrower, inscription.duration)

// Read share balances
const shares = await sdk.shares.balanceOf('0xLENDER', 1n)

// Query the indexer API
const { data } = await sdk.api.listInscriptions({ status: 'open', limit: 10 })

// Execute a transaction (requires account)
const { transaction_hash } = await sdk.inscriptions.repay(1n, [approveCall])
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | Module map, facade pattern, client composition, build config |
| [API Reference](./API-REFERENCE.md) | Complete reference for every exported function, class, and constant |
| [Types](./TYPES.md) | All exported types and interfaces with field descriptions |
| [Flows](./FLOWS.md) | Step-by-step code examples for common workflows |
| [Security Model](./security.md) | How the SDK handles keys, accounts, and browser safety |

---

## Module Overview

| Module | Purpose |
|--------|---------|
| `client/` | `InscriptionClient`, `ShareClient`, `LockerClient`, `ApiClient`, and the `StelaSdk` facade |
| `constants/` | Protocol addresses, network resolution, asset type enums, share math constants |
| `events/` | StarkNet event selectors and parsers for all protocol events |
| `math/` | Pure BigInt share math: conversions, scaling, fee calculations |
| `offchain/` | SNIP-12 typed data builders for gasless signing, Poseidon asset hashing |
| `tokens/` | Curated token registry with addresses for sepolia and mainnet |
| `types/` | TypeScript type definitions: inscriptions, assets, API shapes, events, locker state |
| `utils/` | u256 conversion, address normalization, amount formatting, status computation |

---

## Links

- **Repository:** [github.com/fepvenancio/stela-sdk-ts](https://github.com/fepvenancio/stela-sdk-ts)
- **npm:** [@fepvenancio/stela-sdk](https://www.npmjs.com/package/@fepvenancio/stela-sdk)
