# Usage Flows

Code examples for common SDK workflows.

---

## Create Inscription Flow

Create a new on-chain inscription (requires gas).

```ts
import { StelaSdk, parseAmount } from '@fepvenancio/stela-sdk'
import type { Call, Asset } from '@fepvenancio/stela-sdk'
import { RpcProvider, Account } from 'starknet'

const provider = new RpcProvider({ nodeUrl: 'https://your-rpc' })
const account = new Account(provider, '0xYOUR_ADDRESS', '0xYOUR_PRIVATE_KEY')
const sdk = new StelaSdk({ provider, account, network: 'sepolia' })

// Define the loan parameters
const debtAssets: Asset[] = [
  { asset_address: '0xTOKEN', asset_type: 'ERC20', value: parseAmount('100', 6), token_id: 0n },
]
const interestAssets: Asset[] = [
  { asset_address: '0xTOKEN', asset_type: 'ERC20', value: parseAmount('5', 6), token_id: 0n },
]
const collateralAssets: Asset[] = [
  { asset_address: '0xNFT', asset_type: 'ERC721', value: 0n, token_id: 42n },
]

// Create the inscription
const { transaction_hash } = await sdk.inscriptions.createInscription(
  {
    is_borrow: true,
    debt_assets: debtAssets,
    interest_assets: interestAssets,
    collateral_assets: collateralAssets,
    duration: 604800n,        // 7 days
    deadline: 1735689600n,    // expiry timestamp
    multi_lender: false,
  },
)

console.log('Created inscription, tx:', transaction_hash)
```

---

## Sign / Settle Off-Chain Order Flow

Gasless order creation via SNIP-12 signing, then on-chain settlement by a relayer.

### Step 1: Borrower creates a signed order

```ts
import {
  getInscriptionOrderTypedData,
  hashAssets,
  serializeSignature,
} from '@fepvenancio/stela-sdk'
import { typedData } from 'starknet'

// Build SNIP-12 typed data
const orderTD = getInscriptionOrderTypedData({
  borrower: '0xBORROWER',
  debtAssets,
  interestAssets,
  collateralAssets,
  debtCount: debtAssets.length,
  interestCount: interestAssets.length,
  collateralCount: collateralAssets.length,
  duration: 604800n,
  deadline: 1735689600n,
  multiLender: false,
  nonce: 0n,          // get from sdk.inscriptions.getNonce('0xBORROWER')
  chainId: 'SN_SEPOLIA',
})

// Borrower signs off-chain (no gas)
const signature = await borrowerAccount.signMessage(orderTD)

// Compute the order hash for reference
const orderHash = typedData.getMessageHash(orderTD, '0xBORROWER')

// Serialize and POST to the off-chain API
const stored = serializeSignature(signature)
// POST { orderHash, signature: stored, ...orderParams } to /api/orders
```

### Step 2: Lender signs a lend offer

```ts
import { getLendOfferTypedData } from '@fepvenancio/stela-sdk'

const lendTD = getLendOfferTypedData({
  orderHash,
  lender: '0xLENDER',
  issuedDebtPercentage: 10000n,   // 100%
  nonce: 0n,
  chainId: 'SN_SEPOLIA',
})

const lenderSig = await lenderAccount.signMessage(lendTD)
// POST to /api/orders/:id/offer
```

### Step 3: Relayer settles on-chain

```ts
import { deserializeSignature } from '@fepvenancio/stela-sdk'

// Relayer builds the settle call
const settleCall = sdk.inscriptions.buildSettle({
  order: {
    borrower: '0xBORROWER',
    debtHash: hashAssets(debtAssets),
    interestHash: hashAssets(interestAssets),
    collateralHash: hashAssets(collateralAssets),
    debtCount: 1,
    interestCount: 1,
    collateralCount: 1,
    duration: 604800n,
    deadline: 1735689600n,
    multiLender: false,
    nonce: 0n,
  },
  debtAssets,
  interestAssets,
  collateralAssets,
  borrowerSig: deserializeSignature(borrowerStoredSig),
  offer: {
    orderHash,
    lender: '0xLENDER',
    issuedDebtPercentage: 10000n,
    nonce: 0n,
  },
  lenderSig: deserializeSignature(lenderStoredSig),
})

// Execute
const { transaction_hash } = await relayerClient.execute([settleCall])
```

---

## Event Parsing Flow

Parse raw StarkNet events from RPC into typed event objects.

```ts
import { parseEvents, parseEvent, SELECTORS } from '@fepvenancio/stela-sdk'
import type { RawEvent, StelaEvent } from '@fepvenancio/stela-sdk'

// From an RPC response (e.g. getEvents or transaction receipt)
const rawEvents: RawEvent[] = receipt.events.map(e => ({
  keys: e.keys,
  data: e.data,
  transaction_hash: receipt.transaction_hash,
  block_number: receipt.block_number,
}))

// Parse all at once (skips unrecognized events)
const events: StelaEvent[] = parseEvents(rawEvents)

// Or parse one at a time
for (const raw of rawEvents) {
  const event = parseEvent(raw)
  if (!event) continue  // unrecognized selector

  switch (event.type) {
    case 'InscriptionCreated':
      console.log(`Inscription ${event.inscription_id} created by ${event.creator}`)
      break
    case 'InscriptionSigned':
      console.log(`Inscription ${event.inscription_id} signed, ${event.shares_minted} shares minted`)
      break
    case 'OrderSettled':
      console.log(`Order settled, relayer fee: ${event.relayer_fee_amount}`)
      break
    case 'SharesRedeemed':
      console.log(`${event.shares} shares redeemed by ${event.redeemer}`)
      break
  }
}

// Use SELECTORS for filtering events before parsing
const createdEvents = rawEvents.filter(e => e.keys[0] === SELECTORS.InscriptionCreated)
```

---

## Locker Interaction Flow

Lockers are Token Bound Accounts (TBAs) that hold collateral. The borrower retains governance rights over locked tokens.

### Reading Locker State

```ts
// Get the locker address
const lockerAddress = await sdk.locker.getLockerAddress(1n)

// Check if unlocked (restrictions removed after repay/liquidation)
const isUnlocked = await sdk.locker.isUnlocked(1n)

// Get full state
const state = await sdk.locker.getLockerState(1n)
// { address: '0x...', isUnlocked: false }

// Read token balances held by the locker
const ethBalance = await sdk.locker.getLockerBalance(1n, '0xETH_TOKEN')

// Read multiple token balances
const balances = await sdk.locker.getLockerBalances(1n, ['0xTOKEN_A', '0xTOKEN_B'])
// Map { '0xTOKEN_A' => 1000000n, '0xTOKEN_B' => 500n }
```

### Executing Governance Calls Through the Locker

The locker implements SNIP-6 (`__execute__`), so the borrower can execute calls from the locker's address. This is how a DAO retains voting power over locked governance tokens.

```ts
import type { Call } from '@fepvenancio/stela-sdk'

// Build a governance call (e.g. voting with locked tokens)
const voteCall: Call = {
  contractAddress: '0xGOVERNANCE_TOKEN',
  entrypoint: 'delegate',
  calldata: ['0xDELEGATE_ADDRESS'],
}

// Execute through the locker (requires borrower's account)
const { transaction_hash } = await sdk.locker.executeThrough(1n, voteCall)

// Or batch multiple governance calls
const { transaction_hash: batchTx } = await sdk.locker.executeThroughBatch(1n, [
  voteCall,
  {
    contractAddress: '0xANOTHER_TOKEN',
    entrypoint: 'vote',
    calldata: ['1'],  // proposal ID
  },
])

// You can also build the call manually for custom execution
const lockerCall = sdk.locker.buildLockerExecute('0xLOCKER_ADDRESS', [voteCall])
// Then pass to your own execution flow
```
