# CLAUDE.md — stela-sdk-ts

## Overview
TypeScript SDK for the Stela P2P lending protocol on StarkNet. Source of truth for all developers interacting with the protocol.

## Build & Test
```bash
pnpm install
pnpm build          # tsup → dist/
pnpm test           # vitest
pnpm lint           # if configured
```

## Architecture
- `src/types/` — Protocol types (Asset, StoredInscription, events)
- `src/constants/` — Addresses, protocol constants, asset type enums
- `src/offchain/` — SNIP-12 typed data builders, Poseidon hashing, signature serialization
- `src/client/` — InscriptionClient (call builders + execute), ShareClient, LockerClient, ApiClient, StelaSdk
- `src/utils/` — u256 conversion, address formatting
- `src/math/` — Share calculations
- `src/events/` — Event selectors and parsers

## Key Patterns
- **Call builders** return `{contractAddress, entrypoint, calldata}` for atomic bundling
- **u256** always serialized as `[low, high]` via `toU256(bigint)`
- **Asset arrays** serialized as `[length, ...per-asset: address, type_enum, value_low, value_high, token_id_low, token_id_high]`
- **SNIP-12 typed data** must match Cairo type strings exactly (see `stela/src/snip12.cairo`)
- **Peer dependency**: starknet.js v6

## Important Notes
- StoredInscription fields must match Cairo struct ordering (new fields appended at end)
- TypedData type strings use `u128` for u32/u64 fields (cosmetic — hash is identical)
- u256 fields in typed data need nested `{low, high}` encoding
