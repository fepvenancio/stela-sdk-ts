import { Contract, type RpcProvider, type Account } from 'starknet'
import type { Call } from '../types/common.js'
import stelaAbi from '../abi/stela.json'
import { toU256 } from '../utils/u256.js'

export interface ShareClientOptions {
  stelaAddress: string
  provider: RpcProvider
  account?: Account
}

/**
 * Client for ERC1155 share operations on the Stela contract.
 * Inscription IDs are token IDs — each lender receives shares as ERC1155 tokens.
 *
 * Shares are freely transferable via standard ERC1155 safeTransferFrom.
 * Any address holding shares can call redeem() after repayment/liquidation.
 */
export class ShareClient {
  private contract: Contract
  private address: string
  private account?: Account

  constructor(opts: ShareClientOptions) {
    this.address = opts.stelaAddress
    this.contract = new Contract(stelaAbi, opts.stelaAddress, opts.provider)
    this.account = opts.account
  }

  // ── Read Methods ───────────────────────────────────────────────────

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

  // ── Call Builders ──────────────────────────────────────────────────

  /**
   * Build a call to transfer shares (ERC1155 safeTransferFrom).
   * This enables secondary market trading of lending positions.
   *
   * @param from - Current share holder
   * @param to - Recipient address
   * @param inscriptionId - The inscription (token ID)
   * @param amount - Number of shares to transfer
   * @param data - Optional calldata (empty array by default)
   */
  buildTransferShares(
    from: string,
    to: string,
    inscriptionId: bigint,
    amount: bigint,
    data: string[] = [],
  ): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'safe_transfer_from',
      calldata: [from, to, ...toU256(inscriptionId), ...toU256(amount), String(data.length), ...data],
    }
  }

  /**
   * Build a call to approve an operator for all ERC1155 tokens.
   * Required before a marketplace contract can transfer shares on your behalf.
   *
   * @param operator - The address to approve (e.g., marketplace contract)
   * @param approved - Whether to approve or revoke
   */
  buildSetApprovalForAll(operator: string, approved: boolean): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'set_approval_for_all',
      calldata: [operator, approved ? '1' : '0'],
    }
  }

  // ── Execute Methods ────────────────────────────────────────────────

  /** Transfer shares to another address */
  async transferShares(
    from: string,
    to: string,
    inscriptionId: bigint,
    amount: bigint,
    data: string[] = [],
  ): Promise<{ transaction_hash: string }> {
    if (!this.account) throw new Error('Account required for write operations')
    const result = await this.account.execute([
      this.buildTransferShares(from, to, inscriptionId, amount, data),
    ])
    return { transaction_hash: result.transaction_hash }
  }

  /** Approve or revoke an operator for all ERC1155 tokens */
  async setApprovalForAll(
    operator: string,
    approved: boolean,
  ): Promise<{ transaction_hash: string }> {
    if (!this.account) throw new Error('Account required for write operations')
    const result = await this.account.execute([this.buildSetApprovalForAll(operator, approved)])
    return { transaction_hash: result.transaction_hash }
  }
}

function extractBigInt(result: unknown): bigint {
  const arr = result as unknown[]
  if (typeof arr[0] === 'bigint') return arr[0]
  return BigInt(String(arr[0]))
}
