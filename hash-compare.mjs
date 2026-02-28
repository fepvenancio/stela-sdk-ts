// Compare Cairo vs JS SNIP-12 hash values
import { hash, typedData as starknetTypedData, ec } from 'starknet'

const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
const BORROWER = '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310'
const SN_SEPOLIA = '0x534e5f5345504f4c4941'

// --- 1. hash_assets ---
// Cairo: Poseidon(len, asset_addr, asset_type, value_low, value_high, token_id_low, token_id_high)
const DEBT_AMOUNT = 1000000000000000n
const hashAssetsResult = hash.computePoseidonHashOnElements([
  1n, // len
  BigInt(STRK_ADDRESS), // asset address
  0n, // asset_type ERC20 = 0
  DEBT_AMOUNT & ((1n << 128n) - 1n), // value low
  DEBT_AMOUNT >> 128n, // value high
  0n, // token_id low
  0n, // token_id high
])
console.log('--- hash_assets ---')
console.log('JS result: ', BigInt(hashAssetsResult).toString(10))
console.log('Cairo result:', '3507601595685238366122852511293845153754551806415228293877815094154757786120')
console.log('Match:', BigInt(hashAssetsResult).toString(10) === '3507601595685238366122852511293845153754551806415228293877815094154757786120')

// --- 2. Compute hashes for interest and collateral ---
const INTEREST_AMOUNT = 100000000000000n
const interestHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n,
  INTEREST_AMOUNT & ((1n << 128n) - 1n), INTEREST_AMOUNT >> 128n,
  0n, 0n,
])
const COLLATERAL_AMT = 2000000000000000n
const collateralHash = hash.computePoseidonHashOnElements([
  1n, BigInt(STRK_ADDRESS), 0n,
  COLLATERAL_AMT & ((1n << 128n) - 1n), COLLATERAL_AMT >> 128n,
  0n, 0n,
])

// --- 3. Build typed data (matching Cairo test values) ---
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
  domain: {
    name: 'Stela',
    version: 'v1',
    chainId: SN_SEPOLIA,
    revision: '1',
  },
  message: {
    borrower: BORROWER,
    debt_hash: hashAssetsResult,
    interest_hash: interestHash,
    collateral_hash: collateralHash,
    debt_count: '1',
    interest_count: '1',
    collateral_count: '1',
    duration: '3600',
    deadline: '1772105000',
    multi_lender: false,
    nonce: '0',
  },
}

// --- 4. Get the full message hash via starknet.js ---
const msgHash = starknetTypedData.getMessageHash(orderTypedData, BORROWER)
console.log('\n--- Full message hash (via getMessageHash) ---')
console.log('JS result: ', BigInt(msgHash).toString(10))
console.log('Cairo result:', '187322045224635367670456499349342638228556696478542882645319531136184665067')
console.log('Match:', BigInt(msgHash).toString(10) === '187322045224635367670456499349342638228556696478542882645319531136184665067')

// --- 5. Try computing domain hash manually to isolate mismatch ---
// Method A: shortstring revision (what JS currently does) → revision = 0x31 = 49
const domainTypeHashStr = "\"StarknetDomain\"(\"name\":\"shortstring\",\"version\":\"shortstring\",\"chainId\":\"shortstring\",\"revision\":\"shortstring\")"
const domainTypeHash = BigInt(hash.computePedersenHash(domainTypeHashStr, '0')) // wrong - this is snip12 selector
// Actually starknet.js uses starknetKeccak for type hashes... let me use the getStructHash approach

// Let's just try with getStructHash directly
const domainStructHash = starknetTypedData.getStructHash(
  orderTypedData.types,
  'StarknetDomain',
  orderTypedData.domain,
  starknetTypedData.TypedDataRevision.Active,
)
console.log('\n--- Domain struct hash ---')
console.log('JS result: ', BigInt(domainStructHash).toString(10))
console.log('Cairo result:', '1717905532568891709769749933085861716752668694707928157044318170630900543293')
console.log('Match:', BigInt(domainStructHash).toString(10) === '1717905532568891709769749933085861716752668694707928157044318170630900543293')

// --- 6. Get the struct hash of InscriptionOrder ---
const orderStructHash = starknetTypedData.getStructHash(
  orderTypedData.types,
  'InscriptionOrder',
  orderTypedData.message,
  starknetTypedData.TypedDataRevision.Active,
)
console.log('\n--- Order struct hash ---')
console.log('JS result: ', BigInt(orderStructHash).toString(10))
console.log('Cairo result:', '950223048752578680451628824957866175468744731116865410675484550547780262471')
console.log('Match:', BigInt(orderStructHash).toString(10) === '950223048752578680451628824957866175468744731116865410675484550547780262471')
