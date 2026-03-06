# Running a Stela Relayer

## Overview

Stela is a permissionless P2P lending protocol on StarkNet. Anyone can run a **relayer** to settle matched lending orders on-chain and earn fees. No special permissions are required — the `settle()` function pays the caller (`msg.sender`) directly in the debt asset token(s).

## Fee Economics

Protocol fees go to the treasury address. Genesis NFT holders receive on-chain fee discounts (up to 50%).

| Event | Total Fee | Relayer | Treasury |
|-------|-----------|---------|----------|
| Settlement (Lending) | 20 BPS (0.20%) | **5 BPS** | 15 BPS |
| Swap | 10 BPS (0.10%) | **5 BPS** | 5 BPS |
| Redemption | 10 BPS (0.10%) | 0 BPS | 10 BPS |
| Liquidation | 0 BPS | 0 BPS | 0 BPS |

For a 10,000 USDC loan, the relayer earns **5 USDC** per settlement.

## \`buildSettle()\`

The SDK's \`InscriptionClient.buildSettle()\` constructs the full calldata for the \`settle()\` entrypoint:

\`\`\`typescript
import { InscriptionClient } from '@fepvenancio/stela-sdk'

const client = new InscriptionClient(stelaAddress, account)

const call = client.buildSettle({
  order: {
    borrower: '0x123...',
    debtHash: '0xabc...',
    interestHash: '0xdef...',
    collateralHash: '0x456...',
    debtCount: 1,
    interestCount: 1,
    collateralCount: 1,
    duration: 2592000n,    // 30 days in seconds
    deadline: 1735689600n, // unix timestamp
    multiLender: false,
    nonce: 0n,
  },
  debtAssets: [{ address: '0x...', assetType: 'ERC20', value: 10000n, tokenId: 0n }],
  interestAssets: [{ address: '0x...', assetType: 'ERC20', value: 500n, tokenId: 0n }],
  collateralAssets: [{ address: '0x...', assetType: 'ERC20', value: 15000n, tokenId: 0n }],
  borrowerSig: ['0xr...', '0xs...'],
  offer: {
    orderHash: '0x...',
    lender: '0x...',
    issuedDebtPercentage: 10000n, // 100% = 10000 BPS
    nonce: 0n,
  },
  lenderSig: ['0xr...', '0xs...'],
})

// Execute the transaction
await account.execute([call])
\`\`\`

### Calldata Layout

The \`settle()\` calldata is assembled in this exact order:

1. **InscriptionOrder** (11 fields): borrower, debt_hash, interest_hash, collateral_hash, debt_count, interest_count, collateral_count, duration, deadline, multi_lender (0/1), nonce
2. **Debt assets** array: \`[len, ...per_asset(address, type_enum, value_low, value_high, token_id_low, token_id_high)]\`
3. **Interest assets** array: same format
4. **Collateral assets** array: same format
5. **Borrower signature**: \`[len, r, s]\`
6. **LendOffer** (5 fields): order_hash, lender, bps_low, bps_high, nonce
7. **Lender signature**: \`[len, r, s]\`

## \`buildLiquidate()\`

Liquidation is callable by **anyone** once a filled inscription has expired (i.e., \`block.timestamp > signed_at + duration\`). There is no liquidation fee — the liquidator pays gas only.

\`\`\`typescript
const call = client.buildLiquidate(inscriptionId)
await account.execute([call])
\`\`\`

When liquidated, collateral is released to the lender(s), and the inscription status changes to \`liquidated\`.

### Checking Liquidation Eligibility

Read on-chain state to determine if an inscription is liquidatable:

\`\`\`typescript
const inscription = await client.getInscription(inscriptionId)
const now = Math.floor(Date.now() / 1000)
const isExpired = now > Number(inscription.signed_at + inscription.duration)
const isLiquidatable = isExpired && !inscription.is_repaid && !inscription.liquidated
\`\`\`

## Reference Implementation

For a complete standalone relayer with polling, nonce validation, and Docker support, see:

**[stela-relayer](https://github.com/fepvenancio/stela-relayer)**
