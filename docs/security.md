# Security Model

## Overview

The Stela SDK is designed as a **pure read/build layer**. It reads on-chain state, constructs calldata, and formats data -- but it never handles, stores, or transmits private keys or sensitive credentials.

---

## Key Principles

### 1. No Private Key Handling

The SDK never asks for, stores, or manages private keys. Users bring their own `starknet.js` `Account` instance, which is the only object that can sign transactions. The SDK simply calls `account.execute()` on the account the user provides.

```ts
// The user creates and controls the Account
const account = new Account(provider, address, privateKey)

// The SDK only receives the Account reference
const sdk = new StelaSdk({ provider, account, network: 'sepolia' })

// Internally, write methods call account.execute() -- the SDK never accesses the private key
await sdk.inscriptions.signInscription(1n, 10000n)
```

### 2. Read-Only by Default

If no `Account` is provided, the SDK operates in read-only mode. All read methods (`getInscription`, `balanceOf`, `listInscriptions`, etc.) work without any account. Write methods will throw `"Account required for write operations"` if called without one.

```ts
// Fully functional for reads without any account
const sdk = new StelaSdk({ provider, network: 'sepolia' })
const inscription = await sdk.inscriptions.getInscription(1n)  // works
const shares = await sdk.shares.balanceOf('0x...', 1n)         // works

await sdk.inscriptions.repay(1n)  // throws Error: Account required for write operations
```

### 3. Call Builders are Pure Functions

All `build*` methods return plain `Call` objects (`{ contractAddress, entrypoint, calldata }`) with no side effects. They do not execute anything, do not connect to the network, and do not require an account. This means:

- You can inspect the exact calldata before sending it.
- You can compose multiple calls into a single multicall transaction.
- You can pass calls to external execution frameworks, hardware wallets, or multisig workflows.

```ts
const call = sdk.inscriptions.buildRepay(1n)
// { contractAddress: "0x...", entrypoint: "repay", calldata: ["1", "0"] }
// Nothing has been sent. The user decides what to do with this object.
```

### 4. No Sensitive Data in Exports

The SDK does not export, embed, or reference any secrets. The only addresses it contains are:

- **Protocol contract addresses** (`STELA_ADDRESS`) -- these are public, deployed contract addresses.
- **Token registry addresses** (`TOKENS`) -- these are well-known public token contract addresses.

No API keys, private keys, admin keys, or credentials of any kind are included in the package.

### 5. Off-Chain Signing Uses Standard SNIP-12

The off-chain signing functions (`getInscriptionOrderTypedData`, `getLendOfferTypedData`) build standard SNIP-12 `TypedData` objects. The actual signing is performed by the user's `Account.signMessage()` method -- the SDK only constructs the data to be signed.

The `serializeSignature` / `deserializeSignature` functions handle the `{ r, s }` serialization format for storing signatures. These are public values (the signature itself, not the signing key).

---

## Browser Safety

The SDK is safe to use in browser environments:

- **No Node.js-only dependencies.** The only peer dependency is `starknet` (v6+), which is browser-compatible.
- **No filesystem access.** The SDK does not read from or write to the filesystem.
- **No environment variable access.** The SDK does not read `process.env` or any other environment variables.
- **Tree-shakeable.** Built with `tsup` with `treeshake: true` -- bundlers will only include the functions you actually import.
- **Dual format.** Ships as both ESM (`dist/index.js`) and CJS (`dist/index.cjs`) with TypeScript declarations.

### Content Security Policy (CSP) Considerations

If using the `ApiClient`, note that it makes `fetch()` calls to the indexer API (default: `https://stela-dapp.xyz/api`). Your CSP `connect-src` directive must allow this domain, or you can override the base URL with a same-origin API proxy:

```ts
const api = new ApiClient({ baseUrl: '/api/stela' })
```

---

## Threat Model Summary

| Concern | SDK Behavior |
|---------|-------------|
| Private key exposure | SDK never handles private keys. Users provide their own `Account`. |
| Transaction tampering | `build*` methods return inspectable `Call` objects before execution. |
| Malicious calldata | Calldata is constructed from typed parameters; no raw user input is passed through unsanitized. |
| API data integrity | `ApiClient` fetches from the indexer -- data should be validated against on-chain state for high-value operations. |
| Supply chain | Single peer dependency (`starknet`). No transitive dependency on sensitive packages. |
| Secret leakage | No secrets, API keys, or credentials are embedded in the package. |
