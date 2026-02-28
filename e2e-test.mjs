#!/usr/bin/env node
/**
 * E2E test: Off-chain Order → Settlement Flow
 *
 * Uses sncast for on-chain transactions (approvals + settle)
 * Uses starknet.js for off-chain SNIP-12 signing + API calls
 */

import { execSync } from 'child_process'
import {
  Account,
  RpcProvider,
  Contract,
  hash,
  typedData as starknetTypedData,
  uint256,
  stark,
  ec,
  Signer,
} from 'starknet'

// ─── Config ───────────────────────────────────────────────────────────────────

const RPC_URL = 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo'
const STELA_ADDRESS = '0x021e81956fccd8463342ff7e774bf6616b40e242fe0ea09a6f38735a604ea0e0'
const API_BASE = 'https://stela-dapp.xyz'
const STELA_DIR = '/Users/address0/Documents/Repos/Stela'

const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

const BORROWER = {
  address: '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310',
  privateKey: '0x4b1f6975b16676007b2fb0a87debe5a8c6fdd4f79bf1060931bcfbb5f33218f',
  sncastAccount: 'starkMfer',
}
const LENDER = {
  address: '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b',
  privateKey: '0x49671d3072bea599eddbcb0f9a34e2c8c21a0ecf20e4e36ff3c33895eac721c',
  sncastAccount: 'mfer',
}
const BOT = {
  address: '0x05f9b3f0bf7a3231bc4c34fc53624b2b016d9a819813d6161c9aec13dc8a379a',
  privateKey: '0x2291ff0a5478d67ec8856fcd89e77505c78602e6736f6710c181fa3fd2fc5f6',
  sncastAccount: 'bot',
}

const ASSET_TYPE = { ERC20: 0, ERC721: 1, ERC1155: 2, ERC4626: 3 }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const provider = new RpcProvider({ nodeUrl: RPC_URL })

function toU256(n) {
  const { low, high } = uint256.bnToUint256(n)
  return [low.toString(), high.toString()]
}

function hashAssets(assets) {
  const elements = [String(assets.length)]
  for (const asset of assets) {
    elements.push(asset.asset_address)
    elements.push(String(ASSET_TYPE[asset.asset_type]))
    const [vLow, vHigh] = toU256(asset.value)
    elements.push(vLow, vHigh)
    const [tidLow, tidHigh] = toU256(asset.token_id)
    elements.push(tidLow, tidHigh)
  }
  return hash.computePoseidonHashOnElements(elements)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function sncastOnce(account, cmd) {
  const full = `cd ${STELA_DIR} && sncast --account ${account} ${cmd}`
  const out = execSync(full, { encoding: 'utf8', timeout: 60000 })
  return out.trim()
}

function sncast(account, cmd, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return sncastOnce(account, cmd)
    } catch (err) {
      const msg = err.stderr?.toString() || err.message
      if (msg.includes('rate') || msg.includes('limit') || msg.includes('too fast') || msg.includes('cu limit')) {
        if (i < retries - 1) {
          console.log(`    ⏳ Rate limited, waiting ${(i + 1) * 5}s and retrying...`)
          execSync(`sleep ${(i + 1) * 5}`)
          continue
        }
      }
      throw err
    }
  }
}

function sncastInvoke(account, contractAddress, fn, calldata) {
  const cd = calldata.join(' ')
  return sncast(account, `invoke --contract-address ${contractAddress} --function ${fn} --calldata ${cd} --max-fee 10000000000000000000`)
}

function sncastCall(contractAddress, fn, calldata) {
  const cdPart = calldata.length > 0 ? ` --calldata ${calldata.join(' ')}` : ''
  const out = sncast('starkMfer', `call --contract-address ${contractAddress} --function ${fn}${cdPart}`)
  return out
}

function log(step, msg) {
  console.log(`\n[✓] Step ${step}: ${msg}`)
}
function logDetail(msg) {
  console.log(`    ${msg}`)
}
function fail(step, msg) {
  console.error(`\n[✗] Step ${step}: ${msg}`)
  process.exit(1)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Stela E2E Test — Off-chain Order → Settlement Flow')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Contract:  ${STELA_ADDRESS}`)
  console.log(`  API:       ${API_BASE}`)
  console.log(`  Borrower:  ${BORROWER.address} (${BORROWER.sncastAccount})`)
  console.log(`  Lender:    ${LENDER.address} (${LENDER.sncastAccount})`)
  console.log(`  Bot:       ${BOT.address} (${BOT.sncastAccount})`)
  console.log('═══════════════════════════════════════════════════════════')

  // ── Step 1: Approve tokens via sncast ─────────────────────────────────

  log(1, 'Approving tokens via sncast...')

  const MAX_U128 = '0xffffffffffffffffffffffffffffffff'

  try {
    const out1 = sncastInvoke(BORROWER.sncastAccount, STRK_ADDRESS, 'approve', [STELA_ADDRESS, MAX_U128, '0x0'])
    const txMatch1 = out1.match(/Transaction Hash: (0x[0-9a-f]+)/i)
    logDetail(`Borrower STRK approve → ${txMatch1?.[1] ?? 'submitted'}`)
  } catch (err) {
    fail(1, `Borrower approval: ${err.message}`)
  }

  await sleep(6000) // avoid RPC rate limit

  try {
    const out2 = sncastInvoke(LENDER.sncastAccount, STRK_ADDRESS, 'approve', [STELA_ADDRESS, MAX_U128, '0x0'])
    const txMatch2 = out2.match(/Transaction Hash: (0x[0-9a-f]+)/i)
    logDetail(`Lender STRK approve   → ${txMatch2?.[1] ?? 'submitted'}`)
  } catch (err) {
    fail(1, `Lender approval: ${err.message}`)
  }

  // ── Step 2: Read nonces via sncast ────────────────────────────────────

  await sleep(6000)
  log(2, 'Reading on-chain nonces...')

  let bnonce, lnonce
  try {
    const bnonceOut = sncastCall(STELA_ADDRESS, 'nonces', [BORROWER.address])
    bnonce = BigInt(bnonceOut.match(/0x[0-9a-fA-F]+/)?.[0] ?? '0')
    await sleep(5000)
    const lnonceOut = sncastCall(STELA_ADDRESS, 'nonces', [LENDER.address])
    lnonce = BigInt(lnonceOut.match(/0x[0-9a-fA-F]+/)?.[0] ?? '0')
    logDetail(`Borrower nonce: ${bnonce}`)
    logDetail(`Lender nonce:   ${lnonce}`)
  } catch (err) {
    fail(2, `Read nonces: ${err.message}`)
  }

  await sleep(5000)
  let relayerFee
  try {
    const feeOut = sncastCall(STELA_ADDRESS, 'get_relayer_fee', [])
    const feeMatch = feeOut.match(/0x[0-9a-fA-F]+/g)
    relayerFee = feeMatch ? BigInt(feeMatch[0]) : 0n
    logDetail(`Relayer fee:    ${relayerFee} BPS`)
  } catch (err) {
    logDetail(`Relayer fee:    (could not read, continuing)`)
    relayerFee = 10n
  }

  // ── Step 3: Borrower signs InscriptionOrder off-chain ─────────────────

  log(3, 'Borrower signing InscriptionOrder off-chain...')

  const DEBT_AMOUNT     = BigInt('1000000000000000')   // 0.001 STRK
  const COLLATERAL_AMT  = BigInt('2000000000000000')   // 0.002 STRK
  const INTEREST_AMOUNT = BigInt('100000000000000')    // 0.0001 STRK

  const debtAssets = [
    { asset_address: STRK_ADDRESS, asset_type: 'ERC20', value: DEBT_AMOUNT, token_id: 0n },
  ]
  const interestAssets = [
    { asset_address: STRK_ADDRESS, asset_type: 'ERC20', value: INTEREST_AMOUNT, token_id: 0n },
  ]
  const collateralAssets = [
    { asset_address: STRK_ADDRESS, asset_type: 'ERC20', value: COLLATERAL_AMT, token_id: 0n },
  ]

  const duration = 3600n  // 1 hour
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 7200) // 2 hours from now

  const debtHash = hashAssets(debtAssets)
  const interestHash = hashAssets(interestAssets)
  const collateralHash = hashAssets(collateralAssets)

  logDetail(`Debt hash:       ${debtHash}`)
  logDetail(`Interest hash:   ${interestHash}`)
  logDetail(`Collateral hash: ${collateralHash}`)

  const chainId = await provider.getChainId()
  logDetail(`Chain ID: ${chainId}`)

  const orderTypedData = {
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
    domain: { name: 'Stela', version: 'v1', chainId, revision: '1' },
    message: {
      borrower: BORROWER.address,
      debt_hash: debtHash,
      interest_hash: interestHash,
      collateral_hash: collateralHash,
      debt_count: '1',
      interest_count: '1',
      collateral_count: '1',
      duration: duration.toString(),
      deadline: deadline.toString(),
      multi_lender: false,
      nonce: bnonce.toString(),
    },
  }

  // SNIP-12 hash uses the SIGNER's address (borrower), matching Cairo:
  //   order.get_message_hash(order.borrower) which passes borrower as `signer`
  const orderHash = starknetTypedData.getMessageHash(orderTypedData, BORROWER.address)
  logDetail(`Order hash:   ${orderHash}`)

  // Use Account.signMessage for correct signature format
  const borrowerAccount = new Account(provider, BORROWER.address, BORROWER.privateKey)
  const borrowerSigRaw = await borrowerAccount.signMessage(orderTypedData)
  // Ensure all signature elements are hex strings for calldata
  const borrowerSigArr = (Array.isArray(borrowerSigRaw) ? borrowerSigRaw : [borrowerSigRaw.r, borrowerSigRaw.s])
    .map(v => '0x' + BigInt(v).toString(16))
  logDetail(`Borrower sig (${borrowerSigArr.length} elems): [${borrowerSigArr[0]?.slice(0, 20)}..., ${borrowerSigArr[1]?.slice(0, 20)}...]`)

  // ── Step 4: POST order to API ─────────────────────────────────────────

  log(4, 'Posting order to API...')

  const orderId = `e2e-${Date.now()}`
  const orderData = {
    borrower: BORROWER.address,
    debtAssets: debtAssets.map(a => ({
      asset_address: a.asset_address, asset_type: a.asset_type,
      value: a.value.toString(), token_id: a.token_id.toString(),
    })),
    interestAssets: interestAssets.map(a => ({
      asset_address: a.asset_address, asset_type: a.asset_type,
      value: a.value.toString(), token_id: a.token_id.toString(),
    })),
    collateralAssets: collateralAssets.map(a => ({
      asset_address: a.asset_address, asset_type: a.asset_type,
      value: a.value.toString(), token_id: a.token_id.toString(),
    })),
    duration: duration.toString(),
    deadline: deadline.toString(),
    multiLender: false,
    nonce: bnonce.toString(),
    debtHash, interestHash, collateralHash, orderHash,
  }

  const postOrderRes = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: orderId,
      borrower: BORROWER.address,
      order_data: orderData,
      borrower_signature: JSON.stringify({ r: borrowerSigArr[0], s: borrowerSigArr[1] }),
      nonce: bnonce.toString(),
      deadline: Number(deadline),
    }),
  })

  const postOrderBody = await postOrderRes.json()
  if (!postOrderRes.ok) fail(4, `POST /api/orders failed: ${postOrderRes.status} — ${JSON.stringify(postOrderBody)}`)
  logDetail(`Order created: id=${orderId}`)

  // Verify
  const getOrderRes = await fetch(`${API_BASE}/api/orders/${orderId}`)
  const getOrderBody = await getOrderRes.json()
  if (!getOrderRes.ok) fail(4, `GET /api/orders/${orderId} failed: ${getOrderRes.status}`)
  const orderStatus = (getOrderBody.data ?? getOrderBody).status
  logDetail(`Order status: ${orderStatus}`)

  // ── Step 5: Lender signs LendOffer off-chain ──────────────────────────

  log(5, 'Lender signing LendOffer off-chain...')

  const bps = 10000n

  const offerTypedData = {
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
    domain: { name: 'Stela', version: 'v1', chainId, revision: '1' },
    message: {
      order_hash: orderHash,
      lender: LENDER.address,
      issued_debt_percentage: {
        low: (bps & ((1n << 128n) - 1n)).toString(),
        high: (bps >> 128n).toString(),
      },
      nonce: lnonce.toString(),
    },
  }

  // Hash with LENDER's address, sign with Account.signMessage
  const offerHash = starknetTypedData.getMessageHash(offerTypedData, LENDER.address)
  const lenderAccount = new Account(provider, LENDER.address, LENDER.privateKey)
  const lenderSigRaw = await lenderAccount.signMessage(offerTypedData)
  const lenderSigArr = (Array.isArray(lenderSigRaw) ? lenderSigRaw : [lenderSigRaw.r, lenderSigRaw.s])
    .map(v => '0x' + BigInt(v).toString(16))
  logDetail(`Lender sig (${lenderSigArr.length} elems): [${lenderSigArr[0]?.slice(0, 20)}..., ${lenderSigArr[1]?.slice(0, 20)}...]`)

  // ── Step 6: POST offer to API ─────────────────────────────────────────

  log(6, 'Posting lender offer to API...')

  const offerId = `e2e-offer-${Date.now()}`
  const postOfferRes = await fetch(`${API_BASE}/api/orders/${orderId}/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: offerId,
      lender: LENDER.address,
      bps: Number(bps),
      lender_signature: JSON.stringify({ r: lenderSigArr[0], s: lenderSigArr[1] }),
      nonce: lnonce.toString(),
    }),
  })

  const postOfferBody = await postOfferRes.json()
  if (!postOfferRes.ok) fail(6, `POST offer failed: ${postOfferRes.status} — ${JSON.stringify(postOfferBody)}`)
  logDetail(`Offer created: id=${offerId}`)

  // Verify order is matched
  const matchedRes = await fetch(`${API_BASE}/api/orders/${orderId}`)
  const matchedBody = await matchedRes.json()
  const matchedStatus = (matchedBody.data ?? matchedBody).status
  logDetail(`Order status: ${matchedStatus}`)
  if (matchedStatus !== 'matched') fail(6, `Expected 'matched', got '${matchedStatus}'`)

  // ── Step 7: Bot calls settle() via sncast ─────────────────────────────

  log(7, 'Bot calling settle() via sncast...')

  // Build calldata array
  const calldata = [
    // Order struct (11 fields)
    BORROWER.address,
    debtHash,
    interestHash,
    collateralHash,
    '1', '1', '1',
    duration.toString(),
    deadline.toString(),
    '0',  // multi_lender = false
    bnonce.toString(),
    // debt_assets array
    '1', STRK_ADDRESS, '0', ...toU256(DEBT_AMOUNT), ...toU256(0n),
    // interest_assets array
    '1', STRK_ADDRESS, '0', ...toU256(INTEREST_AMOUNT), ...toU256(0n),
    // collateral_assets array
    '1', STRK_ADDRESS, '0', ...toU256(COLLATERAL_AMT), ...toU256(0n),
    // borrower_sig
    String(borrowerSigArr.length), ...borrowerSigArr,
    // offer struct (5 fields)
    orderHash,
    LENDER.address,
    ...toU256(bps),
    lnonce.toString(),
    // lender_sig
    String(lenderSigArr.length), ...lenderSigArr,
  ]

  logDetail(`Calldata: ${calldata.length} felts`)

  try {
    const settleOut = sncastInvoke(BORROWER.sncastAccount, STELA_ADDRESS, 'settle', calldata)
    const settleTx = settleOut.match(/Transaction Hash: (0x[0-9a-f]+)/i)
    logDetail(`settle() tx: ${settleTx?.[1] ?? 'submitted'}`)
    if (settleTx?.[1]) {
      logDetail(`Starkscan: https://sepolia.starkscan.co/tx/${settleTx[1]}`)
    }
    logDetail(settleOut.includes('Success') ? 'Transaction: SUCCESS' : settleOut.split('\n')[0])
  } catch (err) {
    const stderr = err.stderr?.toString() || err.message
    fail(7, `settle() failed:\n${stderr}`)
  }

  // ── Step 8: Verify nonces incremented ─────────────────────────────────

  log(8, 'Verifying nonces incremented...')

  // Wait a bit for the tx to be processed
  logDetail('Waiting 10s for tx finality...')
  await new Promise(r => setTimeout(r, 10000))

  const newBnOut = sncastCall(STELA_ADDRESS, 'nonces', [BORROWER.address])
  const newBn = BigInt(newBnOut.match(/0x[0-9a-fA-F]+/)?.[0] ?? '0')
  const newLnOut = sncastCall(STELA_ADDRESS, 'nonces', [LENDER.address])
  const newLn = BigInt(newLnOut.match(/0x[0-9a-fA-F]+/)?.[0] ?? '0')

  logDetail(`Borrower nonce: ${bnonce} → ${newBn} ${newBn > bnonce ? '✓' : '✗'}`)
  logDetail(`Lender nonce:   ${lnonce} → ${newLn} ${newLn > lnonce ? '✓' : '✗'}`)

  if (newBn <= bnonce || newLn <= lnonce) {
    fail(8, 'Nonces did not increment — settle may not have executed')
  }

  // ── Step 9: Verify D1 state ───────────────────────────────────────────

  log(9, 'Checking API order state...')

  const finalRes = await fetch(`${API_BASE}/api/orders/${orderId}`)
  const finalBody = await finalRes.json()
  const finalStatus = (finalBody.data ?? finalBody).status
  logDetail(`D1 order status: ${finalStatus}`)
  logDetail('(Bot cron updates to "settled" — current status is expected)')

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  ✓ ALL STEPS PASSED — E2E Flow Complete!')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  1. Token approvals      ✓  (sncast)')
  console.log('  2. Nonces read          ✓  (sncast)')
  console.log('  3. Borrower SNIP-12     ✓  (off-chain sign)')
  console.log('  4. Order → D1 API       ✓  (POST /api/orders)')
  console.log('  5. Lender SNIP-12       ✓  (off-chain sign)')
  console.log('  6. Offer → D1 API       ✓  (POST /api/orders/:id/offer)')
  console.log('  7. Bot settle()         ✓  (on-chain via sncast)')
  console.log('  8. Nonces incremented   ✓  (on-chain verification)')
  console.log('═══════════════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('\n[FATAL]', err)
  process.exit(1)
})
