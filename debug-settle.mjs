// Debug the exact hash computations to find the mismatch
import { hash, typedData as starknetTypedData, ec, uint256 } from 'starknet'
import { execSync } from 'child_process'

const STELA_DIR = '/Users/address0/Documents/Repos/Stela'
const BORROWER_ADDR = '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310'
const BORROWER_KEY = '0x4b1f6975b16676007b2fb0a87debe5a8c6fdd4f79bf1060931bcfbb5f33218f'

const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
const SN_SEPOLIA = '0x534e5f5345504f4c4941'

function toU256(n) {
  const { low, high } = uint256.bnToUint256(n)
  return [low.toString(), high.toString()]
}

// Use EXACT same values as the Cairo hash-compare test
const DEBT_AMOUNT = 1000000000000000n
const INTEREST_AMOUNT = 100000000000000n
const COLLATERAL_AMT = 2000000000000000n

const debtHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n, DEBT_AMOUNT & ((1n << 128n) - 1n), DEBT_AMOUNT >> 128n, 0n, 0n,
])
const interestHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n, INTEREST_AMOUNT & ((1n << 128n) - 1n), INTEREST_AMOUNT >> 128n, 0n, 0n,
])
const collateralHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n, COLLATERAL_AMT & ((1n << 128n) - 1n), COLLATERAL_AMT >> 128n, 0n, 0n,
])

console.log('debtHash:', debtHash)
console.log('interestHash:', interestHash)
console.log('collateralHash:', collateralHash)

const duration = 3600n
const deadline = 1772105000n // FIXED value matching Cairo test
const nonce = 0n

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
  domain: { name: 'Stela', version: 'v1', chainId: SN_SEPOLIA, revision: '1' },
  message: {
    borrower: BORROWER_ADDR,
    debt_hash: debtHash,
    interest_hash: interestHash,
    collateral_hash: collateralHash,
    debt_count: '1',
    interest_count: '1',
    collateral_count: '1',
    duration: duration.toString(),
    deadline: deadline.toString(),
    multi_lender: false,
    nonce: nonce.toString(),
  },
}

// Compute the message hash
const orderHash = starknetTypedData.getMessageHash(orderTypedData, BORROWER_ADDR)
console.log('\nJS orderHash:', orderHash)
console.log('JS orderHash (dec):', BigInt(orderHash).toString(10))

// From the Cairo test output:
console.log('Cairo msg hash (dec): 187322045224635367670456499349342638228556696478542882645319531136184665067')
console.log('Match:', BigInt(orderHash).toString(10) === '187322045224635367670456499349342638228556696478542882645319531136184665067')

// Sign with borrower key
const sig = ec.starkCurve.sign(orderHash, BORROWER_KEY)
const sigR = '0x' + sig.r.toString(16)
const sigS = '0x' + sig.s.toString(16)
console.log('\nSignature r:', sigR)
console.log('Signature s:', sigS)

// Verify directly on-chain
console.log('\n--- Direct is_valid_signature test ---')
const calldata = [orderHash, '2', sigR, sigS].join(' ')
try {
  const out = execSync(`cd ${STELA_DIR} && sncast call --contract-address ${BORROWER_ADDR} --function is_valid_signature --calldata ${calldata}`, { encoding: 'utf8', timeout: 30000 })
  console.log('Result:', out.trim())
} catch (err) {
  console.error('Error:', err.stderr?.toString() || err.message)
}

// Now build the SETTLE calldata with these EXACT SAME values
console.log('\n--- Building settle calldata ---')

// Build the lender side too
const LENDER_ADDR = '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b'
const LENDER_KEY = '0x49671d3072bea599eddbcb0f9a34e2c8c21a0ecf20e4e36ff3c33895eac721c'
const bps = 10000n
const lnonce = 0n

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
  domain: { name: 'Stela', version: 'v1', chainId: SN_SEPOLIA, revision: '1' },
  message: {
    order_hash: orderHash,
    lender: LENDER_ADDR,
    issued_debt_percentage: {
      low: (bps & ((1n << 128n) - 1n)).toString(),
      high: (bps >> 128n).toString(),
    },
    nonce: lnonce.toString(),
  },
}

const offerHash = starknetTypedData.getMessageHash(offerTypedData, LENDER_ADDR)
const lenderSig = ec.starkCurve.sign(offerHash, LENDER_KEY)
const lenderSigR = '0x' + lenderSig.r.toString(16)
const lenderSigS = '0x' + lenderSig.s.toString(16)

console.log('offerHash:', offerHash)
console.log('Lender sig r:', lenderSigR)
console.log('Lender sig s:', lenderSigS)

// Verify lender signature
await new Promise(r => setTimeout(r, 3000))
try {
  const out = execSync(`cd ${STELA_DIR} && sncast call --contract-address ${LENDER_ADDR} --function is_valid_signature --calldata ${offerHash} 2 ${lenderSigR} ${lenderSigS}`, { encoding: 'utf8', timeout: 30000 })
  console.log('Lender is_valid_signature:', out.trim())
} catch (err) {
  console.error('Lender sig verify error:', err.stderr?.toString() || err.message)
}

// Build calldata
const settleCalldata = [
  // Order struct (11 fields)
  BORROWER_ADDR, debtHash, interestHash, collateralHash,
  '1', '1', '1', duration.toString(), deadline.toString(), '0', nonce.toString(),
  // debt_assets array (1 asset)
  '1', STRK_ADDRESS, '0', ...toU256(DEBT_AMOUNT), ...toU256(0n),
  // interest_assets array
  '1', STRK_ADDRESS, '0', ...toU256(INTEREST_AMOUNT), ...toU256(0n),
  // collateral_assets array
  '1', STRK_ADDRESS, '0', ...toU256(COLLATERAL_AMT), ...toU256(0n),
  // borrower_sig
  '2', sigR, sigS,
  // offer struct (LendOffer fields)
  orderHash, LENDER_ADDR, ...toU256(bps), lnonce.toString(),
  // lender_sig
  '2', lenderSigR, lenderSigS,
]

console.log('\nSettle calldata (' + settleCalldata.length + ' felts):')
settleCalldata.forEach((v, i) => console.log(`  [${i}] ${v}`))

// Try calling settle via sncast with bot account
console.log('\n--- Calling settle ---')
await new Promise(r => setTimeout(r, 5000))
try {
  const out = execSync(`cd ${STELA_DIR} && sncast --account bot invoke --contract-address 0x076ca0af65ad05398076ddc067dc856a43dc1c665dc2898aea6b78dd3e120822 --function settle --calldata ${settleCalldata.join(' ')}`, { encoding: 'utf8', timeout: 120000 })
  console.log('settle result:', out.trim())
} catch (err) {
  console.error('settle error:', err.stderr?.toString() || err.message)
}
