import { Contract, type RpcProvider } from 'starknet'
import stelaAbi from '../abi/stela.json'
import { toU256 } from '../utils/u256.js'

export interface ShareClientOptions {
  stelaAddress: string
  provider: RpcProvider
}

/**
 * Client for reading ERC1155 share balances on the Stela contract.
 * Inscription IDs are token IDs — each lender receives shares as ERC1155 tokens.
 */
export class ShareClient {
  private contract: Contract

  constructor(opts: ShareClientOptions) {
    this.contract = new Contract(stelaAbi, opts.stelaAddress, opts.provider)
  }

  /** Get share balance for an account on a specific inscription */
  async balanceOf(account: string, inscriptionId: bigint): Promise<bigint> {
    const result = await this.contract.call('balance_of', [account, ...toU256(inscriptionId)])
    return extractBigInt(result)
  }

  /** Get share balances for multiple account/inscription pairs */
  async balanceOfBatch(accounts: string[], inscriptionIds: bigint[]): Promise<bigint[]> {
    if (accounts.length !== inscriptionIds.length) {
      throw new Error('accounts and inscriptionIds must have the same length')
    }
    const result = await this.contract.call('balance_of_batch', [
      accounts,
      inscriptionIds.map((id) => toU256(id)),
    ])
    const arr = result as unknown[]
    const balances = arr[0] as unknown[]
    return balances.map((b) => BigInt(String(b)))
  }

  /** Check if an operator is approved for all tokens of an owner */
  async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
    const result = await this.contract.call('is_approved_for_all', [owner, operator])
    return Boolean((result as unknown[])[0])
  }
}

function extractBigInt(result: unknown): bigint {
  const arr = result as unknown[]
  if (typeof arr[0] === 'bigint') return arr[0]
  return BigInt(String(arr[0]))
}
