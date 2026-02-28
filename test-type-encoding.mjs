// Debug how starknet.js encodes types for SNIP-12 revision 1
import { typedData as starknetTypedData, hash } from 'starknet'

const types = {
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
}

// Get what starknet.js computes
const typeHash = starknetTypedData.getTypeHash(types, 'LendOffer', starknetTypedData.TypedDataRevision.Active)
console.log('JS type hash:', typeHash)
console.log('JS type hash (dec):', BigInt(typeHash).toString(10))

// Try to get the encode type string
// starknet.js v6 exports encodeType
try {
  const encoded = starknetTypedData.encodeType(types, 'LendOffer', starknetTypedData.TypedDataRevision.Active)
  console.log('\nJS encodeType:', JSON.stringify(encoded))
} catch (err) {
  console.log('\nencodeType not available:', err.message)
}

// Compute starknet_keccak manually for the expected type strings
// Method: starknetKeccak is implemented as keccak256(bytes) masked to 250 bits
// In starknet.js: hash.starknetKeccak(text)

const typeStr1 = '"LendOffer"("order_hash":"felt","lender":"ContractAddress","issued_debt_percentage":"u256","nonce":"felt")'
const typeStr2 = '"LendOffer"("order_hash":"felt","lender":"ContractAddress","issued_debt_percentage":"u256","nonce":"felt")"u256"("low":"u128","high":"u128")'

console.log('\n--- Manual type hash computation ---')
console.log('Type string 1 (no u256):', typeStr1)
const hash1 = hash.starknetKeccak(typeStr1)
console.log('Hash 1:', hash1.toString())
console.log('Hash 1 (dec):', BigInt(hash1).toString(10))

console.log('\nType string 2 (with u256):', typeStr2)
const hash2 = hash.starknetKeccak(typeStr2)
console.log('Hash 2:', hash2.toString())
console.log('Hash 2 (dec):', BigInt(hash2).toString(10))

// Compare with Cairo values
console.log('\n--- Cairo values ---')
console.log('Cairo type hash (no u256):', '1714523496653676941136869103461866249104971816229371359419886581826397724685')
console.log('Cairo type hash (with u256):', '1779850143167829024375046372689727416762053798552002630958952464610224705864')

console.log('\n--- Match checks ---')
console.log('Hash1 matches Cairo (no u256)?', BigInt(hash1).toString(10) === '1714523496653676941136869103461866249104971816229371359419886581826397724685')
console.log('Hash2 matches Cairo (with u256)?', BigInt(hash2).toString(10) === '1779850143167829024375046372689727416762053798552002630958952464610224705864')
console.log('JS type hash matches Hash1?', BigInt(typeHash).toString(10) === BigInt(hash1).toString(10))
console.log('JS type hash matches Hash2?', BigInt(typeHash).toString(10) === BigInt(hash2).toString(10))

// Also check InscriptionOrder for reference
const typesOrder = {
  StarknetDomain: types.StarknetDomain,
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
const orderTypeHash = starknetTypedData.getTypeHash(typesOrder, 'InscriptionOrder', starknetTypedData.TypedDataRevision.Active)
console.log('\n--- InscriptionOrder ---')
console.log('JS type hash:', orderTypeHash)
console.log('JS type hash (dec):', BigInt(orderTypeHash).toString(10))

const orderTypeStr = '"InscriptionOrder"("borrower":"ContractAddress","debt_hash":"felt","interest_hash":"felt","collateral_hash":"felt","debt_count":"u128","interest_count":"u128","collateral_count":"u128","duration":"u128","deadline":"u128","multi_lender":"bool","nonce":"felt")'
const orderHash = hash.starknetKeccak(orderTypeStr)
console.log('Manual starknetKeccak:', orderHash.toString())
console.log('Match JS?', BigInt(orderTypeHash).toString(10) === BigInt(orderHash).toString(10))

// Without u256 type definition
const typesNoU256 = {
  StarknetDomain: types.StarknetDomain,
  LendOffer: types.LendOffer,
  // no u256
}
try {
  const typeHashNoU256 = starknetTypedData.getTypeHash(typesNoU256, 'LendOffer', starknetTypedData.TypedDataRevision.Active)
  console.log('\n--- LendOffer WITHOUT u256 type def ---')
  console.log('JS type hash:', typeHashNoU256)
  console.log('Matches Hash1 (no u256)?', BigInt(typeHashNoU256).toString(10) === BigInt(hash1).toString(10))
} catch (err) {
  console.log('\nWithout u256 def error:', err.message)
}
