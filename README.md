# stela-sdk

TypeScript SDK for the **Stela** P2P lending protocol on StarkNet.

Stela enables peer-to-peer lending through on-chain inscriptions. Borrowers post collateral and request loans; lenders sign inscriptions to fund them. The protocol manages collateral locking via token-bound locker accounts, multi-lender share accounting through ERC1155 tokens, and automated liquidation of expired positions.

## Installation

```bash
pnpm add stela-sdk starknet
```

```bash
npm install stela-sdk starknet
```

## Quick Start

### Read an Inscription

```typescript
import { STELA_ADDRESS, type StoredInscription } from 'stela-sdk'
import { RpcProvider, Contract } from 'starknet'
import stelaAbi from 'stela-sdk/src/abi/stela.json'

const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' })
const contract = new Contract(stelaAbi, STELA_ADDRESS.sepolia, provider)

const inscription: StoredInscription = await contract.get_inscription(inscriptionId)
```

### Create an Inscription

```typescript
import { STELA_ADDRESS, type InscriptionParams, ASSET_TYPE_ENUM } from 'stela-sdk'
import { Account, Contract } from 'starknet'
import stelaAbi from 'stela-sdk/src/abi/stela.json'

const contract = new Contract(stelaAbi, STELA_ADDRESS.sepolia, account)

const params: InscriptionParams = {
  is_borrow: true,
  debt_assets: [{
    asset_address: '0x049d36...', // ETH address
    asset_type: 'ERC20',
    value: 1000000000000000000n, // 1 ETH
    token_id: 0n,
  }],
  interest_assets: [{
    asset_address: '0x049d36...',
    asset_type: 'ERC20',
    value: 50000000000000000n, // 0.05 ETH interest
    token_id: 0n,
  }],
  collateral_assets: [{
    asset_address: '0x053c91...',
    asset_type: 'ERC20',
    value: 2000000000000000000n, // 2x collateral
    token_id: 0n,
  }],
  duration: 604800n, // 7 days
  deadline: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24h to fill
  multi_lender: false,
}

const txHash = await contract.create_inscription(params)
```

### Sign an Inscription (Lend)

```typescript
const MAX_BPS = 10_000n // 100%
await contract.sign_inscription(inscriptionId, MAX_BPS)
```

## Locker Account

When collateral is locked, it is held in a token-bound locker account. The locker restricts asset transfers but allows governance interactions (voting, staking, etc.) through the `__execute__` interface.

```typescript
import { type LockerState } from 'stela-sdk'
import lockerAbi from 'stela-sdk/src/abi/locker.json'

// Get locker address for an inscription
const lockerAddress = await stelaContract.get_locker(inscriptionId)

// Check if locker is unlocked
const lockerContract = new Contract(lockerAbi, lockerAddress, provider)
const isUnlocked = await lockerContract.is_unlocked()

// Execute governance calls through the locker (borrower only, non-transfer calls)
await lockerContract.__execute__([{
  to: governanceTokenAddress,
  selector: selectorFromName('vote'),
  calldata: [proposalId, voteDirection],
}])
```

## API Types

The SDK exports types matching the Stela indexer API responses for use with fetch or API clients:

```typescript
import type { InscriptionRow, ApiListResponse, AssetRow } from 'stela-sdk'

const response = await fetch('https://api.stela.xyz/api/inscriptions?status=open')
const data: ApiListResponse<InscriptionRow> = await response.json()

for (const inscription of data.data) {
  console.log(inscription.id, inscription.status, inscription.assets.length)
}
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Asset` | Token within an inscription (address, type, value, token_id) |
| `InscriptionParams` | Parameters for `create_inscription` |
| `StoredInscription` | Raw on-chain inscription data |
| `Inscription` | Parsed inscription with computed status |
| `InscriptionRow` | API response row for inscription list |
| `AssetRow` | API response row for inscription assets |
| `ApiListResponse<T>` | Paginated list response envelope |
| `ApiDetailResponse<T>` | Single item response envelope |
| `StelaEvent` | Discriminated union of all protocol events |
| `LockerState` | Locker account state (address + unlock status) |
| `LockerCall` | Call to execute through a locker |

### Constants

| Export | Description |
|--------|-------------|
| `STELA_ADDRESS` | Contract addresses per network |
| `resolveNetwork(raw?)` | Validate/default network string |
| `MAX_BPS` | 10,000n (100% in basis points) |
| `VIRTUAL_SHARE_OFFSET` | 1e16n (share calculation offset) |
| `ASSET_TYPE_ENUM` | AssetType to numeric enum mapping |
| `ASSET_TYPE_NAMES` | Numeric enum to AssetType mapping |
| `VALID_STATUSES` | Array of all valid inscription statuses |
| `STATUS_LABELS` | Human-readable status labels |

### ABIs

| File | Contents |
|------|----------|
| `src/abi/stela.json` | Full Stela protocol ABI (IStelaProtocol + ERC1155 + Ownable) |
| `src/abi/erc20.json` | Minimal ERC20 ABI (approve, balanceOf, allowance) |
| `src/abi/locker.json` | Locker account ABI (__execute__, is_unlocked) |

## License

MIT
