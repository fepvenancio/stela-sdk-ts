import { Contract, type RpcProvider, type Account } from 'starknet'
import type { Call } from '../types/common.js'
import type { Asset, InscriptionParams, StoredInscription, SignedOrder } from '../types/inscription.js'
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

  async convertToShares(inscriptionId: bigint, percentage: bigint): Promise<bigint> {
    const result = await this.contract.call('convert_to_shares', [
      ...toU256(inscriptionId),
      ...toU256(percentage),
    ])
    return extractU256(result)
  }

  async getNonce(address: string): Promise<bigint> {
    const result = await this.contract.call('nonces', [address], { blockIdentifier: 'latest' })
    return BigInt(String((result as unknown[])[0] ?? '0'))
  }

  async getRelayerFee(): Promise<bigint> {
    const result = await this.contract.call('get_relayer_fee')
    return extractU256(result)
  }

  async getTreasury(): Promise<string> {
    const result = await this.contract.call('get_treasury')
    return String((result as unknown[])[0])
  }

  async isPaused(): Promise<boolean> {
    const result = await this.contract.call('is_paused')
    return Boolean((result as unknown[])[0])
  }

  async isOrderRegistered(orderHash: string): Promise<boolean> {
    const result = await this.contract.call('is_order_registered', [orderHash])
    return Boolean((result as unknown[])[0])
  }

  async isOrderCancelled(orderHash: string): Promise<boolean> {
    const result = await this.contract.call('is_order_cancelled', [orderHash])
    return Boolean((result as unknown[])[0])
  }

  async getFilledBps(orderHash: string): Promise<bigint> {
    const result = await this.contract.call('get_filled_bps', [orderHash])
    return extractU256(result)
  }

  async getMakerMinNonce(maker: string): Promise<string> {
    const result = await this.contract.call('get_maker_min_nonce', [maker], { blockIdentifier: 'latest' })
    return String((result as unknown[])[0] ?? '0')
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

  buildBatchSettle(params: {
    orders: Array<{
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
    }>
    debtAssetsFlat: Asset[]
    interestAssetsFlat: Asset[]
    collateralAssetsFlat: Asset[]
    borrowerSigs: string[][]
    batchOffer: {
      batchHash: string
      count: number
      lender: string
      startNonce: bigint
    }
    lenderSig: string[]
    bpsList: bigint[]
  }): Call {
    const calldata: string[] = []

    // orders: Array<InscriptionOrder>
    calldata.push(String(params.orders.length))
    for (const order of params.orders) {
      calldata.push(
        order.borrower,
        order.debtHash,
        order.interestHash,
        order.collateralHash,
        String(order.debtCount),
        String(order.interestCount),
        String(order.collateralCount),
        order.duration.toString(),
        order.deadline.toString(),
        order.multiLender ? '1' : '0',
        order.nonce.toString(),
      )
    }

    // debt_assets_flat: Array<Asset>
    calldata.push(...serializeAssets(params.debtAssetsFlat))
    // interest_assets_flat: Array<Asset>
    calldata.push(...serializeAssets(params.interestAssetsFlat))
    // collateral_assets_flat: Array<Asset>
    calldata.push(...serializeAssets(params.collateralAssetsFlat))

    // borrower_sigs: Array<Array<felt252>>
    calldata.push(String(params.borrowerSigs.length))
    for (const sig of params.borrowerSigs) {
      calldata.push(String(sig.length), ...sig)
    }

    // batch_offer: BatchLendOffer struct (4 fields)
    calldata.push(
      params.batchOffer.batchHash,
      String(params.batchOffer.count),
      params.batchOffer.lender,
      params.batchOffer.startNonce.toString(),
    )

    // lender_sig: Array<felt252>
    calldata.push(String(params.lenderSig.length), ...params.lenderSig)

    // bps_list: Array<u256>
    calldata.push(String(params.bpsList.length))
    for (const bps of params.bpsList) {
      calldata.push(...toU256(bps))
    }

    return { contractAddress: this.address, entrypoint: 'batch_settle', calldata }
  }

  buildFillSignedOrder(order: SignedOrder, signature: string[], fillBps: bigint): Call {
    const calldata: string[] = [
      // SignedOrder struct fields
      order.maker,
      order.allowed_taker,
      ...toU256(order.inscription_id),
      ...toU256(order.bps),
      order.deadline.toString(),
      order.nonce,
      ...toU256(order.min_fill_bps),
      // signature array
      String(signature.length),
      ...signature,
      // fill_bps
      ...toU256(fillBps),
    ]
    return { contractAddress: this.address, entrypoint: 'fill_signed_order', calldata }
  }

  buildCancelOrder(order: SignedOrder): Call {
    const calldata: string[] = [
      order.maker,
      order.allowed_taker,
      ...toU256(order.inscription_id),
      ...toU256(order.bps),
      order.deadline.toString(),
      order.nonce,
      ...toU256(order.min_fill_bps),
    ]
    return { contractAddress: this.address, entrypoint: 'cancel_order', calldata }
  }

  buildCancelOrdersByNonce(minNonce: string): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'cancel_orders_by_nonce',
      calldata: [minNonce],
    }
  }

  // ── T1 Call Builders ─────────────────────────────────────────────────

  /** T1-2: Settle a collection-wide lend offer */
  buildSettleCollection(params: {
    offer: {
      lender: string
      debtHash: string
      interestHash: string
      debtCount: number
      interestCount: number
      collectionAddress: string
      duration: bigint
      deadline: bigint
      nonce: bigint
    }
    acceptance: {
      offerHash: string
      borrower: string
      tokenId: bigint
      nonce: bigint
    }
    debtAssets: Asset[]
    interestAssets: Asset[]
    lenderSig: string[]
    borrowerSig: string[]
  }): Call {
    const calldata: string[] = [
      // CollectionLendOffer struct (9 fields)
      params.offer.lender,
      params.offer.debtHash,
      params.offer.interestHash,
      String(params.offer.debtCount),
      String(params.offer.interestCount),
      params.offer.collectionAddress,
      params.offer.duration.toString(),
      params.offer.deadline.toString(),
      params.offer.nonce.toString(),
      // CollectionBorrowAcceptance struct (4 fields)
      params.acceptance.offerHash,
      params.acceptance.borrower,
      ...toU256(params.acceptance.tokenId),
      params.acceptance.nonce.toString(),
      // debt_assets array
      ...serializeAssets(params.debtAssets),
      // interest_assets array
      ...serializeAssets(params.interestAssets),
      // lender_sig array
      String(params.lenderSig.length),
      ...params.lenderSig,
      // borrower_sig array
      String(params.borrowerSig.length),
      ...params.borrowerSig,
    ]
    return { contractAddress: this.address, entrypoint: 'settle_collection', calldata }
  }

  /** T1-4: Commit a renegotiation proposal hash on-chain */
  buildCommitRenegotiation(inscriptionId: bigint, proposalHash: string): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'commit_renegotiation',
      calldata: [...toU256(inscriptionId), proposalHash],
    }
  }

  /** T1-4: Execute a committed renegotiation proposal */
  buildExecuteRenegotiation(params: {
    inscriptionId: bigint
    proposal: {
      inscriptionId: bigint
      proposer: string
      newDuration: bigint
      newInterestHash: string
      newInterestCount: number
      proposalDeadline: bigint
      nonce: bigint
    }
    proposerSig: string[]
    newInterestAssets: Asset[]
  }): Call {
    const calldata: string[] = [
      ...toU256(params.inscriptionId),
      // RenegotiationProposal struct (7 fields)
      ...toU256(params.proposal.inscriptionId),
      params.proposal.proposer,
      params.proposal.newDuration.toString(),
      params.proposal.newInterestHash,
      String(params.proposal.newInterestCount),
      params.proposal.proposalDeadline.toString(),
      params.proposal.nonce.toString(),
      // proposer_sig array
      String(params.proposerSig.length),
      ...params.proposerSig,
      // new_interest_assets array
      ...serializeAssets(params.newInterestAssets),
    ]
    return { contractAddress: this.address, entrypoint: 'execute_renegotiation', calldata }
  }

  /** T1-5: Buy collateral from a borrower's sale offer */
  buildBuyCollateral(params: {
    inscriptionId: bigint
    offer: {
      inscriptionId: bigint
      borrower: string
      minPrice: bigint
      paymentToken: string
      allowedBuyer: string
      deadline: bigint
      nonce: bigint
    }
    borrowerSig: string[]
    salePrice: bigint
  }): Call {
    const calldata: string[] = [
      ...toU256(params.inscriptionId),
      // CollateralSaleOffer struct (7 fields)
      ...toU256(params.offer.inscriptionId),
      params.offer.borrower,
      ...toU256(params.offer.minPrice),
      params.offer.paymentToken,
      params.offer.allowedBuyer,
      params.offer.deadline.toString(),
      params.offer.nonce.toString(),
      // borrower_sig array
      String(params.borrowerSig.length),
      ...params.borrowerSig,
      // sale_price
      ...toU256(params.salePrice),
    ]
    return { contractAddress: this.address, entrypoint: 'buy_collateral', calldata }
  }

  /** T1-1: Refinance an existing loan with a new lender */
  buildRefinance(params: {
    offer: {
      inscriptionId: bigint
      newLender: string
      newDebtHash: string
      newInterestHash: string
      newDebtCount: number
      newInterestCount: number
      newDuration: bigint
      deadline: bigint
      nonce: bigint
    }
    newDebtAssets: Asset[]
    newInterestAssets: Asset[]
    newLenderSig: string[]
    approval: {
      inscriptionId: bigint
      offerHash: string
      borrower: string
      nonce: bigint
    }
    borrowerSig: string[]
  }): Call {
    const calldata: string[] = [
      // RefinanceOffer struct (9 fields)
      ...toU256(params.offer.inscriptionId),
      params.offer.newLender,
      params.offer.newDebtHash,
      params.offer.newInterestHash,
      String(params.offer.newDebtCount),
      String(params.offer.newInterestCount),
      params.offer.newDuration.toString(),
      params.offer.deadline.toString(),
      params.offer.nonce.toString(),
      // new_debt_assets array
      ...serializeAssets(params.newDebtAssets),
      // new_interest_assets array
      ...serializeAssets(params.newInterestAssets),
      // new_lender_sig array
      String(params.newLenderSig.length),
      ...params.newLenderSig,
      // RefinanceApproval struct (4 fields)
      ...toU256(params.approval.inscriptionId),
      params.approval.offerHash,
      params.approval.borrower,
      params.approval.nonce.toString(),
      // borrower_sig array
      String(params.borrowerSig.length),
      ...params.borrowerSig,
    ]
    return { contractAddress: this.address, entrypoint: 'refinance', calldata }
  }

  /** T1-3: Start a Dutch auction on an expired, unfilled inscription */
  buildStartAuction(inscriptionId: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'start_auction',
      calldata: [...toU256(inscriptionId)],
    }
  }

  /** T1-3: Bid on an active Dutch auction */
  buildBid(inscriptionId: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'bid',
      calldata: [...toU256(inscriptionId)],
    }
  }

  /** T1-3: Claim collateral after an auction expires with no bids */
  buildClaimCollateral(inscriptionId: bigint): Call {
    return {
      contractAddress: this.address,
      entrypoint: 'claim_collateral',
      calldata: [...toU256(inscriptionId)],
    }
  }

  // ── T1 Read Methods ──────────────────────────────────────────────────

  /** T1-3: Get the current Dutch auction price for a specific debt asset */
  async getAuctionPrice(inscriptionId: bigint, debtIndex: number): Promise<bigint> {
    const result = await this.contract.call('get_auction_price', [
      ...toU256(inscriptionId),
      String(debtIndex),
    ])
    return extractU256(result)
  }

  /** T1-3: Get the auction end timestamp */
  async getAuctionEndTime(inscriptionId: bigint): Promise<bigint> {
    const result = await this.contract.call('get_auction_end_time', toU256(inscriptionId))
    return BigInt(String((result as unknown[])[0] ?? '0'))
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

  async fillSignedOrder(order: SignedOrder, signature: string[], fillBps: bigint, approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildFillSignedOrder(order, signature, fillBps)]
    return this.execute(calls)
  }

  async cancelOrder(order: SignedOrder): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildCancelOrder(order)])
  }

  async cancelOrdersByNonce(minNonce: string): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildCancelOrdersByNonce(minNonce)])
  }

  // ── T1 Execute Methods ───────────────────────────────────────────────

  async settleCollection(params: Parameters<InscriptionClient['buildSettleCollection']>[0]): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildSettleCollection(params)])
  }

  async commitRenegotiation(inscriptionId: bigint, proposalHash: string): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildCommitRenegotiation(inscriptionId, proposalHash)])
  }

  async executeRenegotiation(params: Parameters<InscriptionClient['buildExecuteRenegotiation']>[0], approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildExecuteRenegotiation(params)]
    return this.execute(calls)
  }

  async buyCollateral(params: Parameters<InscriptionClient['buildBuyCollateral']>[0], approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildBuyCollateral(params)]
    return this.execute(calls)
  }

  async refinance(params: Parameters<InscriptionClient['buildRefinance']>[0], approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildRefinance(params)]
    return this.execute(calls)
  }

  async startAuction(inscriptionId: bigint): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildStartAuction(inscriptionId)])
  }

  async bid(inscriptionId: bigint, approvals?: Call[]): Promise<{ transaction_hash: string }> {
    const calls = [...(approvals ?? []), this.buildBid(inscriptionId)]
    return this.execute(calls)
  }

  async claimCollateral(inscriptionId: bigint): Promise<{ transaction_hash: string }> {
    return this.execute([this.buildClaimCollateral(inscriptionId)])
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
    auction_started: Boolean(get('auction_started', 12)),
    auction_start_time: BigInt(String(get('auction_start_time', 13) ?? '0')),
  }
}

function extractFieldU256(val: unknown): bigint {
  if (typeof val === 'bigint') return val
  if (typeof val === 'object' && val !== null && 'low' in val && 'high' in val) {
    return fromU256(val as { low: bigint; high: bigint })
  }
  return BigInt(String(val))
}
