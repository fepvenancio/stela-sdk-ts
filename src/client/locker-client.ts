import { Contract, RpcProvider, Account, CallData, hash } from 'starknet'
import type { Call } from '../types/common.js'
import type { LockerState } from '../types/locker.js'
import stelaAbi from '../abi/stela.json'
import erc20Abi from '../abi/erc20.json'
import lockerAbi from '../abi/locker.json'
import { toU256 } from '../utils/u256.js'

export class LockerClient {
  constructor(
    private stelaContract: Contract,
    private provider: RpcProvider,
    private account?: Account,
  ) {}

  /** Get the Locker TBA address for an inscription */
  async getLockerAddress(inscriptionId: bigint): Promise<string> {
    const contract = new Contract(stelaAbi, this.stelaContract.address, this.provider)
    const result = await contract.call('get_locker', toU256(inscriptionId))
    return String((result as unknown[])[0])
  }

  /** Check if a locker is unlocked */
  async isUnlocked(inscriptionId: bigint): Promise<boolean> {
    const address = await this.getLockerAddress(inscriptionId)
    const locker = new Contract(lockerAbi, address, this.provider)
    const result = await locker.call('is_unlocked')
    return Boolean((result as unknown[])[0])
  }

  /** Get full locker state */
  async getLockerState(inscriptionId: bigint): Promise<LockerState> {
    const address = await this.getLockerAddress(inscriptionId)
    const locker = new Contract(lockerAbi, address, this.provider)
    const result = await locker.call('is_unlocked')
    const isUnlocked = Boolean((result as unknown[])[0])
    return { address, isUnlocked }
  }

  /** Read ERC20 balance held by a locker */
  async getLockerBalance(inscriptionId: bigint, tokenAddress: string): Promise<bigint> {
    const lockerAddress = await this.getLockerAddress(inscriptionId)
    const token = new Contract(erc20Abi, tokenAddress, this.provider)
    const result = await token.call('balance_of', [lockerAddress])
    return BigInt((result as unknown[])[0] as string | bigint)
  }

  /** Read multiple ERC20 balances held by a locker */
  async getLockerBalances(inscriptionId: bigint, tokenAddresses: string[]): Promise<Map<string, bigint>> {
    const lockerAddress = await this.getLockerAddress(inscriptionId)
    const balances = new Map<string, bigint>()
    for (const addr of tokenAddresses) {
      const token = new Contract(erc20Abi, addr, this.provider)
      const result = await token.call('balance_of', [lockerAddress])
      balances.set(addr, BigInt((result as unknown[])[0] as string | bigint))
    }
    return balances
  }

  // ---- Governance execution through Locker ----

  /**
   * Build a Call to execute an arbitrary call through the Locker TBA.
   * The Locker's __execute__ function proxies calls from the locker's address.
   * This is how a DAO retains governance power over locked collateral.
   *
   * The locker uses SNIP-6 account standard (__execute__). The calldata
   * encodes an array of Call structs, each with:
   *   - to: felt252 (ContractAddress)
   *   - selector: felt252
   *   - calldata: Array<felt252> (length-prefixed)
   */
  buildLockerExecute(lockerAddress: string, innerCalls: Call[]): Call {
    // Serialize Call[] into flat felt252 array for the Span<Call> parameter.
    // Format: [num_calls, call0_to, call0_selector, call0_calldata_len, ...call0_calldata, ...]
    const calldata: string[] = [innerCalls.length.toString()]
    for (const c of innerCalls) {
      calldata.push(c.contractAddress)
      calldata.push(hash.getSelectorFromName(c.entrypoint))
      calldata.push(c.calldata.length.toString())
      calldata.push(...c.calldata)
    }

    return {
      contractAddress: lockerAddress,
      entrypoint: '__execute__',
      calldata,
    }
  }

  /**
   * Execute a governance call through the Locker.
   * Requires account to be the inscription's borrower (NFT owner).
   */
  async executeThrough(inscriptionId: bigint, innerCall: Call): Promise<{ transaction_hash: string }> {
    if (!this.account) throw new Error('Account required for write operations')
    const lockerAddress = await this.getLockerAddress(inscriptionId)
    const call = this.buildLockerExecute(lockerAddress, [innerCall])
    const result = await this.account.execute([call])
    return { transaction_hash: result.transaction_hash }
  }

  /**
   * Execute multiple governance calls through the Locker in a single tx.
   */
  async executeThroughBatch(inscriptionId: bigint, innerCalls: Call[]): Promise<{ transaction_hash: string }> {
    if (!this.account) throw new Error('Account required for write operations')
    const lockerAddress = await this.getLockerAddress(inscriptionId)
    const call = this.buildLockerExecute(lockerAddress, innerCalls)
    const result = await this.account.execute([call])
    return { transaction_hash: result.transaction_hash }
  }
}
