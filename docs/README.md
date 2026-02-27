# Stela SDK Documentation

TypeScript SDK for the Stela P2P lending protocol on StarkNet.

**Package:** `@fepvenancio/stela-sdk`
**Version:** 0.3.0
**License:** MIT
**Peer dependency:** `starknet ^6.0.0`

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Installation, provider setup, and basic usage examples |
| [API Reference](./api-reference.md) | Complete reference for every exported function, class, type, and constant |
| [Security Model](./security.md) | How the SDK handles keys, accounts, and browser safety |

---

## Module Overview

The SDK is organized into the following modules:

| Module | Purpose |
|--------|---------|
| `client/` | High-level clients: `InscriptionClient`, `ShareClient`, `LockerClient`, `ApiClient`, and the `StelaSdk` facade |
| `constants/` | Protocol addresses, network resolution, asset type enums, and share math constants |
| `events/` | StarkNet event selectors and parsers for all Stela protocol events |
| `math/` | Pure BigInt share math: conversions, scaling, and fee calculations |
| `offchain/` | SNIP-12 typed data builders for gasless order/offer signing, plus Poseidon asset hashing |
| `tokens/` | Curated token registry with addresses for sepolia and mainnet |
| `types/` | All TypeScript type definitions: inscriptions, assets, API shapes, events, locker state |
| `utils/` | u256 conversion, address normalization, amount formatting, status computation |

---

## Quick Links

- **Repository:** [github.com/fepvenancio/stela-sdk-ts](https://github.com/fepvenancio/stela-sdk-ts)
- **npm:** [@fepvenancio/stela-sdk](https://www.npmjs.com/package/@fepvenancio/stela-sdk)
