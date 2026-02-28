// Test u256 hashing: does starknet.js SNIP-12 hash u256 as a nested struct or inline?
import { hash, typedData as starknetTypedData } from 'starknet'

const SN_SEPOLIA = '0x534e5f5345504f4c4941'
const LENDER_ADDR = '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b'
const orderHash = '0x6a0540d2b46e295bda7b17a3d04599d313c19a5130ff4e81170ee7eb2ac3eb'
const bps = 10000n
const nonce = 0n

// Version 1: u256 defined as custom struct in types
const offerTypedDataV1 = {
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
    nonce: nonce.toString(),
  },
}

// Version 2: No u256 in types, use u256 as a predefined type
const offerTypedDataV2 = {
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
    // NO u256 definition — let starknet.js use predefined u256
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
    nonce: nonce.toString(),
  },
}

// Get struct hashes
const structHashV1 = starknetTypedData.getStructHash(
  offerTypedDataV1.types,
  'LendOffer',
  offerTypedDataV1.message,
  starknetTypedData.TypedDataRevision.Active,
)
console.log('V1 (u256 as custom struct) LendOffer struct hash:', structHashV1)
console.log('V1 decimal:', BigInt(structHashV1).toString(10))

let structHashV2
try {
  structHashV2 = starknetTypedData.getStructHash(
    offerTypedDataV2.types,
    'LendOffer',
    offerTypedDataV2.message,
    starknetTypedData.TypedDataRevision.Active,
  )
  console.log('V2 (u256 predefined) LendOffer struct hash:', structHashV2)
  console.log('V2 decimal:', BigInt(structHashV2).toString(10))
} catch (err) {
  console.log('V2 error:', err.message)
}

// Compute full message hashes
const msgHashV1 = starknetTypedData.getMessageHash(offerTypedDataV1, LENDER_ADDR)
console.log('\nV1 full message hash:', msgHashV1)

let msgHashV2
try {
  msgHashV2 = starknetTypedData.getMessageHash(offerTypedDataV2, LENDER_ADDR)
  console.log('V2 full message hash:', msgHashV2)
} catch (err) {
  console.log('V2 error:', err.message)
}

if (msgHashV1 && msgHashV2) {
  console.log('\nSame hash?', msgHashV1 === msgHashV2)
}

// Now compute what Cairo would produce (u256 as inline low/high):
// Cairo LendOffer hash_struct:
//   Poseidon(TYPE_HASH, order_hash, lender, bps_low, bps_high, nonce)
// TYPE_HASH = selector!("\"LendOffer\"(\"order_hash\":\"felt\",\"lender\":\"ContractAddress\",\"issued_debt_percentage\":\"u256\",\"nonce\":\"felt\")")
// We need to compute this...

// For comparison, compute inline version:
const LEND_OFFER_TYPE_HASH_STR = '"LendOffer"("order_hash":"felt","lender":"ContractAddress","issued_debt_percentage":"u256","nonce":"felt")'
// starknet-keccak = starknetKeccak(string) (which is what selector! computes)
const typeHashComputed = starknetTypedData.getTypeHash(
  offerTypedDataV1.types,
  'LendOffer',
  starknetTypedData.TypedDataRevision.Active,
)
console.log('\nJS type hash for LendOffer:', typeHashComputed)
console.log('JS type hash (dec):', BigInt(typeHashComputed).toString(10))

// Cairo would compute:
// Poseidon(type_hash, order_hash_value, lender_value, bps_low, bps_high, nonce_value)
const cairoStyleHash = hash.computePoseidonHashOnElements([
  BigInt(typeHashComputed), // type hash
  BigInt(orderHash),        // order_hash
  BigInt(LENDER_ADDR),      // lender
  bps & ((1n << 128n) - 1n), // bps low = 10000
  bps >> 128n,               // bps high = 0
  nonce,                     // nonce = 0
])
console.log('\nCairo-style inline struct hash:', cairoStyleHash)
console.log('Cairo-style (dec):', BigInt(cairoStyleHash).toString(10))

console.log('\nV1 struct hash matches Cairo-style?', structHashV1 === cairoStyleHash)
if (structHashV2) {
  console.log('V2 struct hash matches Cairo-style?', structHashV2 === cairoStyleHash)
}
