# Getting Started

## Installation

```bash
# npm
npm install @fepvenancio/stela-sdk starknet

# pnpm
pnpm add @fepvenancio/stela-sdk starknet
```

`starknet` (v6+) is a peer dependency and must be installed alongside the SDK.

---

## Provider Setup

All on-chain reads and writes go through a `starknet.js` `RpcProvider`. For write operations (creating inscriptions, signing, repaying, etc.), you also need an `Account`.

```ts
import { RpcProvider, Account } from 'starknet'

// Read-only provider
const provider = new RpcProvider({ nodeUrl: 'https://your-starknet-rpc-url' })

// Account for write operations (user brings their own private key)
const account = new Account(provider, '0xYOUR_ADDRESS', '0xYOUR_PRIVATE_KEY')
```

---

## Using the StelaSdk Facade

The simplest way to use the SDK is through the `StelaSdk` class, which wires together all clients automatically.

```ts
import { StelaSdk } from '@fepvenancio/stela-sdk'

const sdk = new StelaSdk({
  provider,
  account,          // optional -- omit for read-only usage
  network: 'sepolia',
})

// sdk.inscriptions  -> InscriptionClient
// sdk.shares        -> ShareClient
// sdk.locker        -> LockerClient
// sdk.api           -> ApiClient
```

---

## Reading an Inscription

```ts
// Read from on-chain contract
const stored = await sdk.inscriptions.getInscription(1n)
console.log(stored.borrower)      // "0x..."
console.log(stored.duration)      // 604800n  (7 days in seconds)
console.log(stored.multi_lender)  // true or false

// Read from the indexer API (includes assets and computed status)
const { data } = await sdk.api.getInscription('0x01')
console.log(data.status)          // "open", "filled", etc.
console.log(data.assets)          // AssetRow[]
```

---

## Building Calldata (Without Executing)

Every write operation has a `build*` method that returns a `Call` object without executing it. This is useful for batching multiple calls, adding ERC20 approvals, or passing calls to a custom execution flow.

```ts
import { StelaSdk } from '@fepvenancio/stela-sdk'
import type { Call, Asset } from '@fepvenancio/stela-sdk'

const sdk = new StelaSdk({ provider, network: 'sepolia' })

// Build a sign-inscription call
const signCall: Call = sdk.inscriptions.buildSignInscription(1n, 10000n)
// { contractAddress: "0x...", entrypoint: "sign_inscription", calldata: [...] }

// Build a cancel call
const cancelCall: Call = sdk.inscriptions.buildCancelInscription(1n)

// Build a create-inscription call
const createCall: Call = sdk.inscriptions.buildCreateInscription({
  is_borrow: true,
  debt_assets: [
    { asset_address: '0xTOKEN', asset_type: 'ERC20', value: 1000000n, token_id: 0n }
  ],
  interest_assets: [
    { asset_address: '0xTOKEN', asset_type: 'ERC20', value: 50000n, token_id: 0n }
  ],
  collateral_assets: [
    { asset_address: '0xNFT', asset_type: 'ERC721', value: 0n, token_id: 42n }
  ],
  duration: 604800n,        // 7 days
  deadline: 1735689600n,    // unix timestamp
  multi_lender: false,
})
```

---

## Executing a Transaction

When you have an `Account` connected, you can execute calls directly.

```ts
const sdk = new StelaSdk({ provider, account, network: 'sepolia' })

// Execute with optional approval calls bundled atomically
const approveCall: Call = {
  contractAddress: '0xTOKEN',
  entrypoint: 'approve',
  calldata: [sdk.stelaAddress, '1000000', '0'],
}

const { transaction_hash } = await sdk.inscriptions.signInscription(
  1n,     // inscription ID
  5000n,  // 50% in basis points
  [approveCall],  // approvals bundled into the same tx
)

console.log('tx:', transaction_hash)
```

---

## Reading Share Balances

```ts
// How many ERC1155 shares does this address hold on inscription #1?
const shares = await sdk.shares.balanceOf('0xLENDER', 1n)
console.log('shares:', shares) // bigint

// Batch query
const balances = await sdk.shares.balanceOfBatch(
  ['0xADDR1', '0xADDR2'],
  [1n, 2n],
)
```

---

## Working with the Indexer API

```ts
// List open inscriptions, page 1, 20 per page
const list = await sdk.api.listInscriptions({
  status: 'open',
  page: 1,
  limit: 20,
})
console.log(list.data)   // InscriptionRow[]
console.log(list.meta)   // { page, limit, total }

// Get share balances for an address
const shares = await sdk.api.getShareBalances('0xADDRESS')

// Get locker info
const lockers = await sdk.api.getLockers('0xADDRESS')
```

---

## Using Utility Functions Standalone

All utility functions are exported at the top level and can be used independently of the clients.

```ts
import {
  computeStatus,
  formatAddress,
  addressesEqual,
  parseAmount,
  formatTokenValue,
  formatDuration,
  findTokenByAddress,
} from '@fepvenancio/stela-sdk'

// Compute inscription status from on-chain fields
const status = computeStatus({
  signed_at: 0n,
  duration: 604800n,
  issued_debt_percentage: 0n,
  is_repaid: false,
  liquidated: false,
  deadline: 1735689600n,
})
// "open" | "expired" | ...

// Format an address for display
formatAddress('0x021e81956fccd8463342ff7e774bf6616b40e242fe0ea09a6f38735a604ea0e0')
// "0x021e...a0e0"

// Compare two addresses (handles padding/casing differences)
addressesEqual('0x68...', '0x0068...')  // true

// Parse "1.5" USDC (6 decimals) to raw value
parseAmount('1.5', 6)  // 1500000n

// Format raw value back to human-readable
formatTokenValue('1500000', 6)  // "1.5"

// Duration formatting
formatDuration(604800n)  // "7d 0h"

// Token lookup
const token = findTokenByAddress('0x049d365...')
// { symbol: 'ETH', name: 'Ether', decimals: 18, ... }
```

---

## Off-Chain Signing (Gasless Orders)

The SDK supports SNIP-12 typed data for gasless order creation and lending offers. A relayer can later settle these on-chain.

```ts
import {
  getInscriptionOrderTypedData,
  getLendOfferTypedData,
  hashAssets,
  serializeSignature,
  deserializeSignature,
} from '@fepvenancio/stela-sdk'

// 1. Build typed data for the borrower's order
const typedData = getInscriptionOrderTypedData({
  borrower: '0xBORROWER',
  debtAssets: [{ asset_address: '0xTOKEN', asset_type: 'ERC20', value: 1000000n, token_id: 0n }],
  interestAssets: [],
  collateralAssets: [],
  debtCount: 1,
  interestCount: 0,
  collateralCount: 0,
  duration: 604800n,
  deadline: 1735689600n,
  multiLender: false,
  nonce: 0n,
  chainId: 'SN_SEPOLIA',
})

// 2. Sign with the user's account (starknet.js)
const signature = await account.signMessage(typedData)

// 3. Serialize for storage
const stored = serializeSignature(signature)  // { r, s }

// 4. Later, deserialize for on-chain settlement
const sigArray = deserializeSignature(stored)  // [r, s]
```

---

## Privacy Pool Operations

The SDK includes a full privacy module for working with Stela's privacy pool. Private lenders can commit shares to a Merkle tree instead of receiving ERC1155 tokens, then later redeem them anonymously.

### Creating a Private Note

```ts
import {
  createPrivateNote,
  computeCommitment,
  computeNullifier,
  computeDepositCommitment,
  generateSalt,
} from '@fepvenancio/stela-sdk'

// Create a private note (auto-generates salt)
const note = createPrivateNote('0xOWNER', 1n, 1000n)
// { owner, inscriptionId, shares, salt, commitment }

// Store this note securely -- it's needed for future redemption
console.log('commitment:', note.commitment)
console.log('salt:', note.salt)  // KEEP SECRET

// Derive a nullifier for redemption
const nullifier = computeNullifier(note.commitment, '0xOWNER_SECRET')
```

### Deposit Commitment for Shielding

```ts
// Compute a deposit commitment for shield() call
const depositCommitment = computeDepositCommitment(
  '0xDEPOSITOR',
  '0xTOKEN',
  1000000n,
  12345n,  // secret salt
)

// Build the shield transaction
const shieldCall = sdk.inscriptions.buildShieldDeposit({
  privacyPoolAddress: '0xPRIVACY_POOL',
  token: '0xTOKEN',
  amount: 1000000n,
  commitment: depositCommitment,
})
```

### Private Settlement

```ts
import { getPrivateLendOfferTypedData } from '@fepvenancio/stela-sdk'

// Build typed data for a private lend offer (lender = 0x0)
const typedData = getPrivateLendOfferTypedData({
  orderHash: '0xORDER_HASH',
  issuedDebtPercentage: 10000n,
  nonce: 0n,
  chainId: 'SN_SEPOLIA',
  depositCommitment: '0xDEPOSIT_COMMITMENT',
})

// Sign with the borrower's account (the lender is anonymous)
const signature = await account.signMessage(typedData)
```

### Private Redemption

```ts
import type { PrivateRedeemRequest } from '@fepvenancio/stela-sdk'

const request: PrivateRedeemRequest = {
  root: '0xMERKLE_ROOT',
  inscriptionId: 1n,
  shares: 1000n,
  nullifier: '0xNULLIFIER',
  changeCommitment: '0x0',  // full redemption
  recipient: '0xRECIPIENT',
}

const { transaction_hash } = await sdk.inscriptions.privateRedeem(
  request,
  merkleProof,  // string[]
)
```

---

## Event Parsing

```ts
import { parseEvents, SELECTORS } from '@fepvenancio/stela-sdk'

// Parse raw StarkNet events into typed StelaEvent objects
const events = parseEvents(rawEventsFromRpc)

for (const event of events) {
  switch (event.type) {
    case 'InscriptionCreated':
      console.log('Created:', event.inscription_id, 'by', event.creator)
      break
    case 'InscriptionSigned':
      console.log('Signed:', event.inscription_id, 'lender:', event.lender)
      break
    case 'SharesRedeemed':
      console.log('Redeemed:', event.shares, 'shares')
      break
  }
}
```
