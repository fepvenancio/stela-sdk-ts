import { Contract, type RpcProvider, type Account } from 'starknet'
import type { Call } from '../types/common.js'
import type { Asset, InscriptionParams, StoredInscription } from '../types/inscription.js'
import stelaAbi from '../abi/stela.json'
import { toU256, fromU256 } from '../utils/u256.js'
import { ASSET_TYPE_ENUM } from '../constants/protocol.js'

export interface InscriptionClientOptions {
  stelaAddress: string
  provider: RpcProvider
  account?: Account
}

export class InscriptionClient {
  private contract: Contract
  private address: string
  private account?: Account

  constructor(opts: InscriptionClientOptions) {
    this.address = opts.stelaAddress
    this.account = opts.account
    this.contract = new Contract(stelaAbi, opts.stelaAddress, opts.provider)
  }

  // ── Read Methods ───────────────────────────────────────────────────

  async getInscription(inscriptionId: bigint): Promise<StoredInscription> {
    const result = await this.contract.call('get_inscription', toU256(inscriptionId))
    return parseStoredInscription(result)
  }

  async getLocker(inscriptionId: bigint): Promise<string> {
    const result = await this.contract.call('get_locker', toU256(inscriptionId))
    return String((result as unknown[])[0])
  }

  async getInscriptionFee(): Promise<bigint> {
    const result = await this.contract.call('get_inscription_fee')
    return extractU256(result)
  }

  async convertToShares(inscriptionId: bigint, percentage: bigint): Promise<bigint> {
    const result = await this.contract.call('convert_to_shares', [
      ...toU256(inscriptionId),
      ...toU256(percentage),
    ])
    return extractU256(result)
  }

  async getNonce(address: string): Promise<bigint> {
    const result = await this.contract.call('nonces', [address])
    return BigInt(String((result as unknown[])[0] ?? '0'))
  }

  async getRelayerFee(): Promise<bigint> {
    const result = await this.contract.call('get_relayer_fee')
    return extractU256(result)
  }

  // ── Call Builders ──────────────────────────────────────────────────

  buildCreateInscription(params: InscriptionParams): Call {
    const calldata: string[] = [
      params.is_borrow ? '1' : '0',
      ...serializeAssets(params.debt_assets),
      ...serializeAssets(params.interest_assets),
      ...serializeAssets(params.collateral_assets),
      params.duration.toString(),
      params.deadline.toString(),
      params.multi_lender ? '1' : '0',
    ]
    return { contractAddress: this.address, entrypoint: 'create_inscription', calldata }
  }

  buildSignInscription(inscriptionId: bigint, bps: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'sign_inscription',
      calldata: [...toU256(inscriptionId), ...toU256(bps)],
    }
  }

  buildCancelInscription(inscriptionId: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'cancel_inscription',
      calldata: [...toU256(inscriptionId)],
    }
  }

  buildRepay(inscriptionId: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'repay',
      calldata: [...toU256(inscriptionId)],
    }
  }

  buildLiquidate(inscriptionId: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'liquidate',
      calldata: [...toU256(inscriptionId)],
    }
  }

  buildRedeem(inscriptionId: bigint, shares: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'redeem',
      calldata: [...toU256(inscriptionId), ...toU256(shares)],
    }
  }

  buildSettle(params: {
    order: {
      borrower: string
      debtHash: string
      interestHash: string
      collateralHash: string
      debtCount: number
      interestCount: number
      collateralCount: number
      duration: bigint
      deadline: bigint
      multiLender: boolean
      nonce: bigint
    }
    debtAssets: Asset[]
    interestAssets: Asset[]
    collateralAssets: Asset[]
    borrowerSig: string[]
    offer: {
      orderHash: string
      lender: string
      issuedDebtPercentage: bigint
      nonce: bigint
    }
    lenderSig: string[]
  }): Call {
    const calldata: string[] = [
      // Order struct fields
      params.order.borrower,
      params.order.debtHash,
      params.order.interestHash,
      params.order.collateralHash,
      String(params.order.debtCount),
      String(params.order.interestCount),
      String(params.order.collateralCount),
      params.order.duration.toString(),
      params.order.deadline.toString(),
      params.order.multiLender ? '1' : '0',
      params.order.nonce.toString(),
      // debt_assets array
      ...serializeAssets(params.debtAssets),
      // interest_assets array
      ...serializeAssets(params.interestAssets),
      // collateral_assets array
      ...serializeAssets(params.collateralAssets),
      // borrower_sig array
      String(params.borrowerSig.length),
      ...params.borrowerSig,
      // offer struct
      params.offer.orderHash,
      params.offer.lender,
      ...toU256(params.offer.issuedDebtPercentage),
      params.offer.nonce.toString(),
      // lender_sig array
      String(params.lenderSig.length),
      ...params.lenderSig,
    ]
    return { contractAddress: this.address, entrypoint: 'settle', calldata }
  }

  // ── Execute Methods ────────────────────────────────────────────────

  /**
   * Execute one or more calls via the connected account.
   * Pass approval calls to bundle ERC20 approve + protocol call atomically.
   */
  async execute(calls: Call[]): Promise<{ transaction_hash: string }> {
    if (!this.account) throw new Error('Account required for write operations')
    const result = await this.account.execute(calls)
    return { transaction_hash: result.transaction_hash }
  }

  async createInscription(params: InscriptionParams, approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildCreateInscription(params)]
    return this.execute(calls)
  }

  async signInscription(inscriptionId: bigint, bps: bigint, approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildSignInscription(inscriptionId, bps)]
    return this.execute(calls)
  }

  async cancelInscription(inscriptionId: bigint): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildCancelInscription(inscriptionId)])
  }

  async repay(inscriptionId: bigint, approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildRepay(inscriptionId)]
    return this.execute(calls)
  }

  async liquidate(inscriptionId: bigint): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildLiquidate(inscriptionId)])
  }

  async redeem(inscriptionId: bigint, shares: bigint): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildRedeem(inscriptionId, shares)])
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function serializeAssets(assets: Asset[]): string[] {
  const calldata: string[] = [String(assets.length)]
  for (const a of assets) {
    calldata.push(a.asset_address)
    calldata.push(String(ASSET_TYPE_ENUM[a.asset_type]))
    calldata.push(...toU256(a.value))
    calldata.push(...toU256(a.token_id))
  }
  return calldata
}

function extractU256(result: unknown): bigint {
  const arr = result as unknown[]
  if (typeof arr[0] === 'bigint') return arr[0]
  if (typeof arr[0] === 'object' && arr[0] !== null && 'low' in arr[0] && 'high' in arr[0]) {
    const u = arr[0] as { low: bigint; high: bigint }
    return fromU256(u)
  }
  return BigInt(String(arr[0]))
}

function parseStoredInscription(result: unknown): StoredInscription {
  const r = result as Record<string, unknown>
  // starknet.js v6 returns a named struct or array depending on call
  const get = (key: string, index: number): unknown => {
    if (key in r) return r[key]
    const arr = result as unknown[]
    return arr[index]
  }

  return {
    borrower: String(get('borrower', 0)),
    lender: String(get('lender', 1)),
    duration: BigInt(String(get('duration', 2))),
    deadline: BigInt(String(get('deadline', 3))),
    signed_at: BigInt(String(get('signed_at', 4))),
    issued_debt_percentage: extractFieldU256(get('issued_debt_percentage', 5)),
    is_repaid: Boolean(get('is_repaid', 6)),
    liquidated: Boolean(get('liquidated', 7)),
    multi_lender: Boolean(get('multi_lender', 8)),
    debt_asset_count: Number(get('debt_asset_count', 9)),
    interest_asset_count: Number(get('interest_asset_count', 10)),
    collateral_asset_count: Number(get('collateral_asset_count', 11)),
  }
}

function extractFieldU256(val: unknown): bigint {
  if (typeof val === 'bigint') return val
  if (typeof val === 'object' && val !== null && 'low' in val && 'high' in val) {
    return fromU256(val as { low: bigint; high: bigint })
  }
  return BigInt(String(val))
}
