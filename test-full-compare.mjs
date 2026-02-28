// Full step-by-step comparison between JS and Cairo hash computations
import { hash, typedData as starknetTypedData } from 'starknet'

const BORROWER = '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310'
const LENDER = '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b'
const SN_SEPOLIA = '0x534e5f5345504f4c4941'
const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

// -- hash_assets --
const debtHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n, 1000000000000000n, 0n, 0n, 0n,
])
const interestHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n, 100000000000000n, 0n, 0n, 0n,
])
const collateralHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n, 2000000000000000n, 0n, 0n, 0n,
])

// -- Test: what encodeType string does starknet.js use for InscriptionOrder? --
const orderTypes = {
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
}

// Check encodeType for both revisions
try {
  const encoded0 = starknetTypedData.encodeType(orderTypes, 'InscriptionOrder', starknetTypedData.TypedDataRevision.Legacy)
  console.log('InscriptionOrder encodeType Legacy:', JSON.stringify(encoded0))
} catch (e) { console.log('Legacy encodeType error:', e.message) }

try {
  const encoded1 = starknetTypedData.encodeType(orderTypes, 'InscriptionOrder', starknetTypedData.TypedDataRevision.Active)
  console.log('InscriptionOrder encodeType Active:', JSON.stringify(encoded1))

  // Compute keccak of this
  const keccakResult = hash.starknetKeccak(encoded1)
  console.log('starknetKeccak of Active encodeType:', keccakResult.toString())
  console.log('starknetKeccak (dec):', BigInt(keccakResult).toString(10))
} catch (e) { console.log('Active encodeType error:', e.message) }

// Get type hashes for both revisions
try {
  const th0 = starknetTypedData.getTypeHash(orderTypes, 'InscriptionOrder', starknetTypedData.TypedDataRevision.Legacy)
  console.log('\nInscriptionOrder typeHash Legacy:', th0)
  console.log('Legacy (dec):', BigInt(th0).toString(10))
} catch (e) { console.log('Legacy typeHash error:', e.message) }

const th1 = starknetTypedData.getTypeHash(orderTypes, 'InscriptionOrder', starknetTypedData.TypedDataRevision.Active)
console.log('InscriptionOrder typeHash Active:', th1)
console.log('Active (dec):', BigInt(th1).toString(10))

// Compute struct hash for both revisions
try {
  const msg = {
    borrower: BORROWER, debt_hash: debtHash, interest_hash: interestHash, collateral_hash: collateralHash,
    debt_count: '1', interest_count: '1', collateral_count: '1',
    duration: '3600', deadline: '1772105000', multi_lender: false, nonce: '0',
  }

  const sh0 = starknetTypedData.getStructHash(orderTypes, 'InscriptionOrder', msg, starknetTypedData.TypedDataRevision.Legacy)
  console.log('\nInscriptionOrder structHash Legacy:', sh0)
  console.log('Legacy (dec):', BigInt(sh0).toString(10))
} catch (e) { console.log('Legacy structHash error:', e.message) }

try {
  const msg = {
    borrower: BORROWER, debt_hash: debtHash, interest_hash: interestHash, collateral_hash: collateralHash,
    debt_count: '1', interest_count: '1', collateral_count: '1',
    duration: '3600', deadline: '1772105000', multi_lender: false, nonce: '0',
  }

  const sh1 = starknetTypedData.getStructHash(orderTypes, 'InscriptionOrder', msg, starknetTypedData.TypedDataRevision.Active)
  console.log('InscriptionOrder structHash Active:', sh1)
  console.log('Active (dec):', BigInt(sh1).toString(10))
} catch (e) { console.log('Active structHash error:', e.message) }

console.log('\nCairo InscriptionOrder struct hash: 950223048752578680451628824957866175468744731116865410675484550547780262471')

// Now check: does getMessageHash use Active or Legacy internally?
const orderTypedData = {
  types: orderTypes,
  primaryType: 'InscriptionOrder',
  domain: { name: 'Stela', version: 'v1', chainId: SN_SEPOLIA, revision: '1' },
  message: {
    borrower: BORROWER, debt_hash: debtHash, interest_hash: interestHash, collateral_hash: collateralHash,
    debt_count: '1', interest_count: '1', collateral_count: '1',
    duration: '3600', deadline: '1772105000', multi_lender: false, nonce: '0',
  },
}
const fullHash = starknetTypedData.getMessageHash(orderTypedData, BORROWER)
console.log('\ngetMessageHash result:', fullHash)
console.log('getMessageHash (dec):', BigInt(fullHash).toString(10))
console.log('Cairo full msg hash:', '187322045224635367670456499349342638228556696478542882645319531136184665067')
console.log('Match:', BigInt(fullHash).toString(10) === '187322045224635367670456499349342638228556696478542882645319531136184665067')
