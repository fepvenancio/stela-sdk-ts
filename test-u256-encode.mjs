// Reverse-engineer exactly how starknet.js encodes u256 within a struct for SNIP-12 revision 1
import { hash, typedData as starknetTypedData } from 'starknet'

const SN_SEPOLIA = '0x534e5f5345504f4c4941'
const LENDER = '0x024a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b'
const orderHashValue = '0x6a0540d2b46e295bda7b17a3d04599d313c19a5130ff4e81170ee7eb2ac3eb'

// LendOffer with u256 field
const lendOfferTypes = {
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

const msg = {
  order_hash: orderHashValue,
  lender: LENDER,
  issued_debt_percentage: { low: '10000', high: '0' },
  nonce: '0',
}

const td = {
  types: lendOfferTypes,
  primaryType: 'LendOffer',
  domain: { name: 'Stela', version: 'v1', chainId: SN_SEPOLIA, revision: '1' },
  message: msg,
}

// Get the actual message hash from starknet.js
const fullMsgHash = starknetTypedData.getMessageHash(td, LENDER)
console.log('JS getMessageHash:', fullMsgHash)
console.log('JS getMessageHash (dec):', BigInt(fullMsgHash).toString(10))
console.log('Cairo full msg hash:     290775056444828185236460243645973292239431855747987107865849221507990814756')
console.log()

// Now try different manual computations of the struct hash

// 1. Cairo style: u256 as two inline felts, no u256 sub-type in type hash
const cairoTypeHash = hash.starknetKeccak('"LendOffer"("order_hash":"felt","lender":"ContractAddress","issued_debt_percentage":"u256","nonce":"felt")')
const cairoStructHash = hash.computePoseidonHashOnElements([
  BigInt(cairoTypeHash), BigInt(orderHashValue), BigInt(LENDER), 10000n, 0n, 0n,
])
console.log('Method 1 (Cairo - quoted, inline u256):')
console.log('  type hash:', cairoTypeHash.toString())
console.log('  struct hash:', BigInt(cairoStructHash).toString(10))

// 2. Unquoted type, inline u256 (starknet.js Legacy encoding?)
const unquotedTypeHash = hash.starknetKeccak('LendOffer(order_hash:felt,lender:ContractAddress,issued_debt_percentage:u256,nonce:felt)')
const unquotedStructHash = hash.computePoseidonHashOnElements([
  BigInt(unquotedTypeHash), BigInt(orderHashValue), BigInt(LENDER), 10000n, 0n, 0n,
])
console.log('\nMethod 2 (unquoted, inline u256):')
console.log('  type hash:', unquotedTypeHash.toString())
console.log('  struct hash:', BigInt(unquotedStructHash).toString(10))

// 3. Quoted type with u256 sub-type, u256 as struct hash
const quotedWithU256TypeHash = hash.starknetKeccak('"LendOffer"("order_hash":"felt","lender":"ContractAddress","issued_debt_percentage":"u256","nonce":"felt")"u256"("low":"u128","high":"u128")')
const u256TypeHash = hash.starknetKeccak('"u256"("low":"u128","high":"u128")')
const u256StructHash = hash.computePoseidonHashOnElements([
  BigInt(u256TypeHash), 10000n, 0n,
])
const quotedWithU256StructHash = hash.computePoseidonHashOnElements([
  BigInt(quotedWithU256TypeHash), BigInt(orderHashValue), BigInt(LENDER), BigInt(u256StructHash), 0n,
])
console.log('\nMethod 3 (quoted, u256 as struct hash):')
console.log('  u256 type hash:', u256TypeHash.toString())
console.log('  u256 struct hash:', BigInt(u256StructHash).toString(10))
console.log('  LendOffer type hash:', quotedWithU256TypeHash.toString())
console.log('  struct hash:', BigInt(quotedWithU256StructHash).toString(10))

// 4. Unquoted type with u256 sub-type, u256 as struct hash
const unquotedWithU256TypeHash = hash.starknetKeccak('LendOffer(order_hash:felt,lender:ContractAddress,issued_debt_percentage:u256,nonce:felt)u256(low:u128,high:u128)')
const u256UnquotedTypeHash = hash.starknetKeccak('u256(low:u128,high:u128)')
const u256UnquotedStructHash = hash.computePoseidonHashOnElements([
  BigInt(u256UnquotedTypeHash), 10000n, 0n,
])
const unquotedWithU256StructHash = hash.computePoseidonHashOnElements([
  BigInt(unquotedWithU256TypeHash), BigInt(orderHashValue), BigInt(LENDER), BigInt(u256UnquotedStructHash), 0n,
])
console.log('\nMethod 4 (unquoted, u256 as struct hash):')
console.log('  u256 type hash:', u256UnquotedTypeHash.toString())
console.log('  u256 struct hash:', BigInt(u256UnquotedStructHash).toString(10))
console.log('  LendOffer type hash:', unquotedWithU256TypeHash.toString())
console.log('  struct hash:', BigInt(unquotedWithU256StructHash).toString(10))

// Now test which method produces the same message hash as starknet.js
console.log('\n--- Testing which method matches starknet.js ---')
const domain_hash_quoted = hash.computePoseidonHashOnElements([
  BigInt(hash.starknetKeccak('"StarknetDomain"("name":"shortstring","version":"shortstring","chainId":"shortstring","revision":"shortstring")')),
  BigInt('0x5374656c61'), // 'Stela'
  BigInt('0x7631'), // 'v1'
  BigInt(SN_SEPOLIA),
  1n,
])
const domain_hash_unquoted = hash.computePoseidonHashOnElements([
  BigInt(hash.starknetKeccak('StarknetDomain(name:shortstring,version:shortstring,chainId:shortstring,revision:shortstring)')),
  BigInt('0x5374656c61'), // 'Stela'
  BigInt('0x7631'), // 'v1'
  BigInt(SN_SEPOLIA),
  1n,
])

for (const [name, domainHash, structHash] of [
  ['Method 1 (quoted, inline)', domain_hash_quoted, cairoStructHash],
  ['Method 2 (unquoted, inline)', domain_hash_unquoted, unquotedStructHash],
  ['Method 3 (quoted, u256 struct)', domain_hash_quoted, quotedWithU256StructHash],
  ['Method 4 (unquoted, u256 struct)', domain_hash_unquoted, unquotedWithU256StructHash],
]) {
  const msgHash = hash.computePoseidonHashOnElements([
    BigInt('0x537461726b4e6574204d657373616765'), // 'StarkNet Message'
    BigInt(domainHash),
    BigInt(LENDER),
    BigInt(structHash),
  ])
  const matches = BigInt(msgHash).toString(10) === BigInt(fullMsgHash).toString(10)
  console.log(`${name}: ${matches ? '✓ MATCHES' : '✗ no match'} → ${BigInt(msgHash).toString(10).slice(0, 30)}...`)
}
