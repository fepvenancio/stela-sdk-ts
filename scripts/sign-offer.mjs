/**
 * Sign an off-chain LendOffer using the bot account against a pending order.
 *
 * Usage:
 *   node scripts/sign-offer.mjs
 *
 * Uses the same .env as create-orders.mjs (scripts/.env).
 */

import { RpcProvider, Account, typedData as starknetTypedData, uint256, hash } from 'starknet'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ─── Load .env ──────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '.env')

function loadEnv(path) {
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.error(`No .env found at ${path}`)
    process.exit(1)
  }
}

loadEnv(envPath)

// ─── Config ─────────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL || 'https://api.cartridge.gg/x/starknet/sepolia'
const API_BASE = process.env.API_BASE || 'https://stela-dapp.xyz/api'
const STELA_ADDRESS = '0x021e81956fccd8463342ff7e774bf6616b40e242fe0ea09a6f38735a604ea0e0'
const CHAIN_ID = 'SN_SEPOLIA'

// Bot is the lender
const BOT_ADDRESS = process.env.ACCOUNT1_ADDRESS
const BOT_PK = process.env.ACCOUNT1_PK

if (!BOT_ADDRESS || !BOT_PK) {
  console.error('Missing ACCOUNT1_ADDRESS or ACCOUNT1_PK in scripts/.env')
  process.exit(1)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ASSET_TYPE_ENUM = { ERC20: 0, ERC721: 1, ERC1155: 2, ERC4626: 3 }

function toU256(n) {
  const { low, high } = uint256.bnToUint256(n)
  return [low.toString(), high.toString()]
}

function hashAssets(assets) {
  const elements = [String(assets.length)]
  for (const a of assets) {
    elements.push(a.asset_address)
    elements.push(String(ASSET_TYPE_ENUM[a.asset_type]))
    const [vL, vH] = toU256(BigInt(a.value))
    elements.push(vL, vH)
    const [tL, tH] = toU256(BigInt(a.token_id ?? '0'))
    elements.push(tL, tH)
  }
  return hash.computePoseidonHashOnElements(elements)
}

function getInscriptionOrderTypedData(params) {
  return {
    types: {
      StarknetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
        { name: 'revision', type: 'shortstring' },
      ],
      InscriptionOrder: [
        { name: 'borrower', type: 'ContractAddress' },
        { name: 'debt_hash', type: 'felt' },
        { name: 'interest_hash', type: 'felt' },
        { name: 'collateral_hash', type: 'felt' },
        { name: 'debt_count', type: 'u128' },
        { name: 'interest_count', type: 'u128' },
        { name: 'collateral_count', type: 'u128' },
        { name: 'duration', type: 'u128' },
        { name: 'deadline', type: 'u128' },
        { name: 'multi_lender', type: 'bool' },
        { name: 'nonce', type: 'felt' },
      ],
    },
    primaryType: 'InscriptionOrder',
    domain: { name: 'Stela', version: 'v1', chainId: CHAIN_ID, revision: '1' },
    message: {
      borrower: params.borrower,
      debt_hash: hashAssets(params.debtAssets),
      interest_hash: hashAssets(params.interestAssets),
      collateral_hash: hashAssets(params.collateralAssets),
      debt_count: String(params.debtCount),
      interest_count: String(params.interestCount),
      collateral_count: String(params.collateralCount),
      duration: params.duration.toString(),
      deadline: params.deadline.toString(),
      multi_lender: params.multiLender,
      nonce: params.nonce.toString(),
    },
  }
}

function getLendOfferTypedData(params) {
  return {
    types: {
      StarknetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
        { name: 'revision', type: 'shortstring' },
      ],
      LendOffer: [
        { name: 'order_hash', type: 'felt' },
        { name: 'lender', type: 'ContractAddress' },
        { name: 'issued_debt_percentage', type: 'u256' },
        { name: 'nonce', type: 'felt' },
      ],
      u256: [
        { name: 'low', type: 'u128' },
        { name: 'high', type: 'u128' },
      ],
    },
    primaryType: 'LendOffer',
    domain: { name: 'Stela', version: 'v1', chainId: CHAIN_ID, revision: '1' },
    message: {
      order_hash: params.orderHash,
      lender: params.lender,
      issued_debt_percentage: {
        low: (params.issuedDebtPercentage & ((1n << 128n) - 1n)).toString(),
        high: (params.issuedDebtPercentage >> 128n).toString(),
      },
      nonce: params.nonce.toString(),
    },
  }
}

// ─── Get nonce from contract ────────────────────────────────────────────────

async function getNonce(provider, stelaAddress, accountAddress) {
  const resp = await provider.callContract({
    contractAddress: stelaAddress,
    entrypoint: 'nonces',
    calldata: [accountAddress],
  }, 'latest')
  return BigInt(resp[0])
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Stela Off-Chain Offer Signer')
  console.log('═══════════════════════════════════════════════════════════')

  const provider = new RpcProvider({ nodeUrl: RPC_URL, blockIdentifier: 'latest' })
  const botAccount = new Account(provider, BOT_ADDRESS, BOT_PK)

  // 1. Fetch pending orders
  console.log('\n── Step 1: Fetching pending orders ─────────────────────────')
  const resp = await fetch(`${API_BASE}/orders?status=pending`)
  if (!resp.ok) {
    console.error(`Failed to fetch orders: ${resp.status}`)
    process.exit(1)
  }
  const { data: orders } = await resp.json()
  console.log(`  Found ${orders.length} pending orders`)

  if (orders.length === 0) {
    console.log('  No pending orders to sign. Exiting.')
    return
  }

  // 2. Pick first order not owned by bot
  const order = orders.find(o => o.borrower.toLowerCase() !== BOT_ADDRESS.toLowerCase())
  if (!order) {
    console.log('  All orders belong to bot account. Cannot self-lend.')
    return
  }

  console.log(`\n  Selected order: ${order.id}`)
  console.log(`  Borrower: ${order.borrower}`)

  // 3. Parse order data
  const orderData = typeof order.order_data === 'string'
    ? JSON.parse(order.order_data)
    : order.order_data

  const debtAssets = orderData.debtAssets || orderData.debt_assets || []
  const interestAssets = orderData.interestAssets || orderData.interest_assets || []
  const collateralAssets = orderData.collateralAssets || orderData.collateral_assets || []
  const multiLender = orderData.multiLender ?? orderData.multi_lender ?? false
  const duration = orderData.duration || '0'
  const deadline = orderData.deadline || '0'
  const orderNonce = orderData.nonce || order.nonce || '0'

  console.log(`  Debt: ${debtAssets.length} assets, Interest: ${interestAssets.length} assets`)
  console.log(`  Multi-lender: ${multiLender}`)

  // 4. Compute order hash (InscriptionOrder SNIP-12)
  console.log('\n── Step 2: Computing order hash ────────────────────────────')

  const orderTypedData = getInscriptionOrderTypedData({
    borrower: order.borrower,
    debtAssets,
    interestAssets,
    collateralAssets,
    debtCount: debtAssets.length,
    interestCount: interestAssets.length,
    collateralCount: collateralAssets.length,
    duration: BigInt(duration),
    deadline: BigInt(deadline),
    multiLender: multiLender,
    nonce: BigInt(orderNonce),
  })

  const orderHash = starknetTypedData.getMessageHash(orderTypedData, order.borrower)
  console.log(`  Order hash: ${orderHash}`)

  // 5. Get bot nonce from contract
  console.log('\n── Step 3: Getting bot nonce ────────────────────────────────')
  const botNonce = await getNonce(provider, STELA_ADDRESS, BOT_ADDRESS)
  console.log(`  Bot nonce: ${botNonce}`)

  // 6. Build LendOffer typed data
  const bps = 10000 // 100% for single-lender
  console.log(`\n── Step 4: Signing LendOffer (${bps} BPS) ──────────────────`)

  const lendOfferTypedData = getLendOfferTypedData({
    orderHash,
    lender: BOT_ADDRESS,
    issuedDebtPercentage: BigInt(bps),
    nonce: botNonce,
    chainId: CHAIN_ID,
  })

  // Sign
  const signature = await botAccount.signMessage(lendOfferTypedData)
  const toHex = (v) => '0x' + BigInt(v).toString(16)
  const sigArr = Array.isArray(signature)
    ? signature.map(s => toHex(s))
    : [toHex(signature.r), toHex(signature.s)]

  console.log(`  Signature: [${sigArr[0].slice(0, 18)}..., ${sigArr[1].slice(0, 18)}...]`)

  // 7. Verify locally first
  console.log('\n── Step 5: Verifying signature locally ─────────────────────')
  const msgHash = starknetTypedData.getMessageHash(lendOfferTypedData, BOT_ADDRESS)
  console.log(`  Message hash: ${msgHash}`)

  // 8. POST offer to API
  console.log('\n── Step 6: Posting offer to API ────────────────────────────')

  const offerId = crypto.randomUUID()
  const payload = {
    id: offerId,
    lender: BOT_ADDRESS,
    bps,
    lender_signature: sigArr,
    nonce: botNonce.toString(),
  }

  console.log(`  Payload:`, JSON.stringify(payload, null, 2))

  const offerResp = await fetch(`${API_BASE}/orders/${order.id}/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await offerResp.json()

  if (offerResp.ok) {
    console.log(`\n  ✓ Offer submitted successfully!`)
    console.log(`  Offer ID: ${offerId}`)
    console.log(`  Order ID: ${order.id}`)
  } else {
    console.log(`\n  ✗ Failed: ${offerResp.status}`)
    console.log(`  Response:`, JSON.stringify(result, null, 2))
  }

  console.log('\n═══════════════════════════════════════════════════════════\n')
}

main().catch(console.error)
