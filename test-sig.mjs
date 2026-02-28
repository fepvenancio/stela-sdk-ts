// Direct signature verification test
import { ec, hash, typedData as starknetTypedData, Account, RpcProvider } from 'starknet'

const RPC_URL = 'https://rpc.starknet-testnet.lava.build'
const provider = new RpcProvider({ nodeUrl: RPC_URL })
const { execSync } = await import('child_process')

const BORROWER = {
  address: '0x005441affcd25fe95554b13690346ebec62a27282327dd297cab01a897b08310',
  privateKey: '0x4b1f6975b16676007b2fb0a87debe5a8c6fdd4f79bf1060931bcfbb5f33218f',
}
const STELA_DIR = '/Users/address0/Documents/Repos/Stela'

// Step 1: Compute a simple hash
const testHash = '0x461a1b9ed272aef3ffc4f784a220bd7180a8daa4b13d69381c1e2266549429b'

// Step 2: Sign with Account (same as E2E test)
const borrowerAccount = new Account(provider, BORROWER.address, BORROWER.privateKey)

// Sign using ec.starkCurve.sign directly (same as what Signer does internally)
const sigRaw = ec.starkCurve.sign(testHash, BORROWER.privateKey)
console.log('sig r:', '0x' + sigRaw.r.toString(16))
console.log('sig s:', '0x' + sigRaw.s.toString(16))
const sigArr = ['0x' + sigRaw.r.toString(16), '0x' + sigRaw.s.toString(16)]

// Step 3: Call is_valid_signature on the borrower's account
const calldata = [testHash, String(sigArr.length), ...sigArr].join(' ')
console.log('\nCalling is_valid_signature...')
console.log('calldata:', calldata)

try {
  const out = execSync(`cd ${STELA_DIR} && sncast call --contract-address ${BORROWER.address} --function is_valid_signature --calldata ${calldata}`, { encoding: 'utf8', timeout: 30000 })
  console.log('Result:', out.trim())
} catch (err) {
  console.error('Error:', err.stderr?.toString() || err.message)
}

// Also verify the signature locally
const verified = ec.starkCurve.verify(sigRaw, testHash, '0x666dce9b5b05693f583250d26487675931e31b18eda463c41a574a2cbe17174')
console.log('\nLocal verification:', verified)
