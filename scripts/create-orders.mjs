/**
 * Create off-chain inscriptions (orders) using two accounts.
 *
 * Usage:
 *   cp scripts/.env.example scripts/.env
 *   # fill in account addresses and private keys
 *   node scripts/create-orders.mjs
 *
 * NEVER commit scripts/.env — it contains private keys.
 */

import { RpcProvider, Account, Contract, uint256, hash } from 'starknet'
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
    console.error(`⚠ No .env found at ${path}. Copy scripts/.env.example → scripts/.env and fill in values.`)
    process.exit(1)
  }
}

loadEnv(envPath)

// ─── Config ─────────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL || 'https://api.cartridge.gg/x/starknet/sepolia'
const API_BASE = process.env.API_BASE || 'https://stela-dapp.xyz/api'
const STELA_ADDRESS = '0x021e81956fccd8463342ff7e774bf6616b40e242fe0ea09a6f38735a604ea0e0'
const CHAIN_ID = 'SN_SEPOLIA'

const ACCOUNT1_ADDRESS = process.env.ACCOUNT1_ADDRESS
const ACCOUNT1_PK = process.env.ACCOUNT1_PK
const ACCOUNT2_ADDRESS = process.env.ACCOUNT2_ADDRESS
const ACCOUNT2_PK = process.env.ACCOUNT2_PK

if (!ACCOUNT1_ADDRESS || !ACCOUNT1_PK) {
  console.error('Missing ACCOUNT1_ADDRESS or ACCOUNT1_PK in scripts/.env')
  process.exit(1)
}
if (!ACCOUNT2_ADDRESS || !ACCOUNT2_PK) {
  console.error('Missing ACCOUNT2_ADDRESS or ACCOUNT2_PK in scripts/.env')
  process.exit(1)
}

// ─── Token addresses (Sepolia) ──────────────────────────────────────────────

const TOKENS = {
  ETH:      { address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', decimals: 18 },
  STRK:     { address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', decimals: 18 },
  mUSDC:    { address: '0x034a0cf09c79e7f20fb2136212f27b7dd88e91f9a24b2ac50c5c41ff6b30c59d', decimals: 6  },
  mWETH:    { address: '0x07e86764396d61d2179cd1a48033fa4f30897cb172464961a80649aff4da9bdd', decimals: 18 },
  mDAI:     { address: '0x0479f31a23241b1337375b083099bd1672716edbf908b1b30148a648657a1cee', decimals: 18 },
  StelaNFT: { address: '0x04f2345306bf8ef1c8c1445661354ef08421aa092459445a5d6b46641237e943', decimals: 0  },
}

// ─── ERC20 ABI (Sierra format for starknet.js v6) ───────────────────────────

const ERC20_ABI = [
  {
    type: 'struct',
    name: 'core::integer::u256',
    members: [
      { name: 'low', type: 'core::integer::u128' },
      { name: 'high', type: 'core::integer::u128' },
    ],
  },
  {
    type: 'interface',
    name: 'erc20',
    items: [
      {
        type: 'function',
        name: 'balance_of',
        inputs: [{ name: 'account', type: 'core::starknet::contract_address::ContractAddress' }],
        outputs: [{ type: 'core::integer::u256' }],
        state_mutability: 'view',
      },
    ],
  },
]

// ─── Asset type enum matching Cairo ─────────────────────────────────────────

const ASSET_TYPE_ENUM = { ERC20: 0, ERC721: 1, ERC1155: 2, ERC4626: 3 }

// ─── Helpers ────────────────────────────────────────────────────────────────

function toU256(n) {
  const { low, high } = uint256.bnToUint256(n)
  return [low.toString(), high.toString()]
}

function hashAssets(assets) {
  const elements = [String(assets.length)]
  for (const a of assets) {
    elements.push(a.asset_address)
    elements.push(String(ASSET_TYPE_ENUM[a.asset_type]))
    const [vL, vH] = toU256(a.value)
    elements.push(vL, vH)
    const [tL, tH] = toU256(a.token_id)
    elements.push(tL, tH)
  }
  return hash.computePoseidonHashOnElements(elements)
}

function bigIntReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value
}

function formatBalance(raw, decimals) {
  if (decimals === 0) return raw.toString()
  const str = raw.toString().padStart(decimals + 1, '0')
  const intPart = str.slice(0, str.length - decimals) || '0'
  const fracPart = str.slice(str.length - decimals).replace(/0+$/, '')
  return fracPart ? `${intPart}.${fracPart}` : intPart
}

function amount(value, decimals) {
  return BigInt(value) * 10n ** BigInt(decimals)
}

// ─── SNIP-12 typed data builder (matches SDK) ───────────────────────────────

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

// ─── Provider & Accounts ────────────────────────────────────────────────────

const provider = new RpcProvider({ nodeUrl: RPC_URL, default_block: 'latest' })
const account1 = new Account(provider, ACCOUNT1_ADDRESS, ACCOUNT1_PK)
const account2 = new Account(provider, ACCOUNT2_ADDRESS, ACCOUNT2_PK)

// ─── Step 1: Check balances ─────────────────────────────────────────────────

async function getBalance(address, tokenAddress) {
  try {
    const resp = await provider.callContract({
      contractAddress: tokenAddress,
      entrypoint: 'balance_of',
      calldata: [address],
    }, 'latest')
    const low = BigInt(resp[0])
    const high = BigInt(resp[1])
    return low + (high << 128n)
  } catch (e) {
    console.error(`    balance error: ${e.message?.slice(0, 80)}`)
    return -1n
  }
}

async function checkBalances(label, address) {
  console.log(`\n══════ ${label} ══════`)
  console.log(`Address: ${address}\n`)

  const balances = {}
  for (const [symbol, token] of Object.entries(TOKENS)) {
    const raw = await getBalance(address, token.address)
    if (raw === -1n) {
      console.log(`  ${symbol.padEnd(10)} ERROR reading balance`)
    } else {
      console.log(`  ${symbol.padEnd(10)} ${formatBalance(raw, token.decimals).padStart(20)} (raw: ${raw})`)
      balances[symbol] = raw
    }
  }
  return balances
}

// ─── Step 2: Create & post orders ───────────────────────────────────────────

let nonceCounter = BigInt(Date.now())

async function createOrder(account, label, orderDef) {
  const nonce = nonceCounter++
  const now = Math.floor(Date.now() / 1000)
  const deadline = BigInt(now + orderDef.deadlineSeconds)

  const typedData = getInscriptionOrderTypedData({
    borrower: account.address,
    debtAssets: orderDef.debtAssets,
    interestAssets: orderDef.interestAssets,
    collateralAssets: orderDef.collateralAssets,
    debtCount: orderDef.debtAssets.length,
    interestCount: orderDef.interestAssets.length,
    collateralCount: orderDef.collateralAssets.length,
    duration: orderDef.duration,
    deadline,
    multiLender: orderDef.multiLender || false,
    nonce,
  })

  console.log(`\n  Signing "${orderDef.name}" as ${label}...`)
  const signature = await account.signMessage(typedData)
  const toHex = (v) => '0x' + BigInt(v).toString(16)
  const sigArr = Array.isArray(signature)
    ? signature.map((s) => toHex(s))
    : [toHex(signature.r), toHex(signature.s)]

  const orderData = {
    borrower: account.address,
    debtAssets: orderDef.debtAssets,
    interestAssets: orderDef.interestAssets,
    collateralAssets: orderDef.collateralAssets,
    duration: orderDef.duration.toString(),
    deadline: deadline.toString(),
    multiLender: orderDef.multiLender || false,
    nonce: nonce.toString(),
  }

  // order ID = poseidon hash of the typed data message fields
  const orderIdElements = [
    account.address,
    typedData.message.debt_hash,
    typedData.message.interest_hash,
    typedData.message.collateral_hash,
    String(orderDef.debtAssets.length),
    String(orderDef.interestAssets.length),
    String(orderDef.collateralAssets.length),
    orderDef.duration.toString(),
    deadline.toString(),
    orderDef.multiLender ? '1' : '0',
    nonce.toString(),
  ]
  const orderId = hash.computePoseidonHashOnElements(orderIdElements)

  const payload = {
    id: orderId,
    borrower: account.address,
    order_data: JSON.parse(JSON.stringify(orderData, bigIntReplacer)),
    borrower_signature: sigArr,
    nonce: nonce.toString(),
    deadline: Number(deadline),
  }

  console.log(`  Posting order ${orderId.slice(0, 18)}... to API`)

  const resp = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload, bigIntReplacer),
  })

  const result = await resp.json()
  if (resp.ok) {
    console.log(`  ✓ Order created: ${orderId}`)
  } else {
    console.log(`  ✗ Failed: ${JSON.stringify(result)}`)
  }

  return { orderId, success: resp.ok }
}

// ─── Step 3: Define orders based on balances ────────────────────────────────

function buildOrders(label, address, balances) {
  const orders = []

  // Only create orders with tokens the account actually holds
  const hasMusdc = (balances.mUSDC || 0n) > 0n
  const hasMweth = (balances.mWETH || 0n) > 0n
  const hasMdai  = (balances.mDAI || 0n) > 0n
  const hasStrk  = (balances.STRK || 0n) > 0n

  const musdcBal = balances.mUSDC || 0n
  const mwethBal = balances.mWETH || 0n
  const mdaiBal  = balances.mDAI || 0n
  const strkBal  = balances.STRK || 0n

  const asset = (symbol, val) => ({
    asset_address: TOKENS[symbol].address,
    asset_type: 'ERC20',
    value: val,
    token_id: 0n,
  })

  // Order 1: Borrow mUSDC, offer interest in mUSDC, collateral in mWETH
  if (hasMusdc && hasMweth) {
    const debtAmt = musdcBal / 4n  // use 25% of balance as debt
    const interestAmt = debtAmt / 20n  // 5% interest
    const collateralAmt = mwethBal / 4n  // 25% of mWETH as collateral

    if (debtAmt > 0n && collateralAmt > 0n) {
      orders.push({
        name: `${label}: Borrow mUSDC / Collateral mWETH (7d)`,
        debtAssets: [asset('mUSDC', debtAmt)],
        interestAssets: interestAmt > 0n ? [asset('mUSDC', interestAmt)] : [],
        collateralAssets: [asset('mWETH', collateralAmt)],
        duration: 604800n, // 7 days
        deadlineSeconds: 86400 * 7, // 7 day deadline
        multiLender: false,
      })
    }
  }

  // Order 2: Borrow mDAI, collateral in STRK
  if (hasMdai && hasStrk) {
    const debtAmt = mdaiBal / 4n
    const interestAmt = debtAmt / 10n  // 10% interest
    const collateralAmt = strkBal / 5n

    if (debtAmt > 0n && collateralAmt > 0n) {
      orders.push({
        name: `${label}: Borrow mDAI / Collateral STRK (14d)`,
        debtAssets: [asset('mDAI', debtAmt)],
        interestAssets: interestAmt > 0n ? [asset('mDAI', interestAmt)] : [],
        collateralAssets: [asset('STRK', collateralAmt)],
        duration: 1209600n, // 14 days
        deadlineSeconds: 86400 * 14,
        multiLender: false,
      })
    }
  }

  // Order 3: Borrow mWETH, collateral in mUSDC (multi-lender)
  if (hasMweth && hasMusdc) {
    const debtAmt = mwethBal / 5n
    const interestAmt = debtAmt / 25n  // 4% interest
    const collateralAmt = musdcBal / 5n

    if (debtAmt > 0n && collateralAmt > 0n) {
      orders.push({
        name: `${label}: Borrow mWETH / Collateral mUSDC (3d, multi-lender)`,
        debtAssets: [asset('mWETH', debtAmt)],
        interestAssets: interestAmt > 0n ? [asset('mWETH', interestAmt)] : [],
        collateralAssets: [asset('mUSDC', collateralAmt)],
        duration: 259200n, // 3 days
        deadlineSeconds: 86400 * 3,
        multiLender: true,
      })
    }
  }

  // Order 4: Borrow STRK, collateral in mDAI
  if (hasStrk && hasMdai) {
    const debtAmt = strkBal / 6n
    const interestAmt = debtAmt / 15n
    const collateralAmt = mdaiBal / 6n

    if (debtAmt > 0n && collateralAmt > 0n) {
      orders.push({
        name: `${label}: Borrow STRK / Collateral mDAI (30d)`,
        debtAssets: [asset('STRK', debtAmt)],
        interestAssets: interestAmt > 0n ? [asset('STRK', interestAmt)] : [],
        collateralAssets: [asset('mDAI', collateralAmt)],
        duration: 2592000n, // 30 days
        deadlineSeconds: 86400 * 30,
        multiLender: false,
      })
    }
  }

  return orders
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Stela Off-Chain Inscription Creator')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Stela Contract: ${STELA_ADDRESS}`)
  console.log(`  RPC: ${RPC_URL}`)
  console.log(`  API: ${API_BASE}`)

  // Check balances
  console.log('\n── Step 1: Checking Token Balances ─────────────────────────')

  const bal1 = await checkBalances('Account 1 (Bot)', ACCOUNT1_ADDRESS)
  const bal2 = await checkBalances('Account 2 (Mfer)', ACCOUNT2_ADDRESS)

  // Build orders based on balances
  console.log('\n── Step 2: Building Orders Based on Balances ───────────────')

  const orders1 = buildOrders('Bot', ACCOUNT1_ADDRESS, bal1)
  const orders2 = buildOrders('Mfer', ACCOUNT2_ADDRESS, bal2)

  console.log(`\n  Account 1 (Bot):  ${orders1.length} orders possible`)
  console.log(`  Account 2 (Mfer): ${orders2.length} orders possible`)

  if (orders1.length + orders2.length === 0) {
    console.log('\n  No orders possible — accounts have insufficient token balances.')
    console.log('  Use the faucet at https://stela-dapp.xyz/faucet to mint test tokens.')
    return
  }

  // Sign and post orders
  console.log('\n── Step 3: Signing & Posting Orders ────────────────────────')

  let created = 0
  let failed = 0

  for (const order of orders1) {
    const { success } = await createOrder(account1, 'Bot', order)
    if (success) created++; else failed++
  }

  for (const order of orders2) {
    const { success } = await createOrder(account2, 'Mfer', order)
    if (success) created++; else failed++
  }

  // Summary
  console.log('\n── Summary ─────────────────────────────────────────────────')
  console.log(`  Created: ${created}`)
  console.log(`  Failed:  ${failed}`)
  console.log('═══════════════════════════════════════════════════════════\n')
}

main().catch(console.error)
