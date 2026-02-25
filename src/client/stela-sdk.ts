import { Contract, type RpcProvider, type Account } from 'starknet'
import type { Network } from '../types/common.js'
import { STELA_ADDRESS, resolveNetwork } from '../constants/addresses.js'
import { InscriptionClient } from './inscription-client.js'
import { ShareClient } from './share-client.js'
import { LockerClient } from './locker-client.js'
import { ApiClient } from './api-client.js'
import { MatchingClient } from './matching-client.js'
import stelaAbi from '../abi/stela.json'

export interface StelaSdkOptions {
  /** StarkNet RPC provider */
  provider: RpcProvider
  /** Connected account for write operations (optional for read-only) */
  account?: Account
  /** Network name or auto-detect from provider */
  network?: Network | string
  /** Custom API base URL */
  apiBaseUrl?: string
  /** Override the contract address (for custom deployments) */
  stelaAddress?: string
  /** Matching engine base URL (optional — if omitted, sdk.matching is undefined) */
  matchingEngineUrl?: string
}

/**
 * Main SDK facade that wires together all clients.
 *
 * ```ts
 * const sdk = new StelaSdk({ provider, account, network: 'sepolia' })
 * const inscription = await sdk.inscriptions.getInscription(1n)
 * const shares = await sdk.shares.balanceOf(myAddress, 1n)
 * ```
 */
export class StelaSdk {
  readonly inscriptions: InscriptionClient
  readonly shares: ShareClient
  readonly locker: LockerClient
  readonly api: ApiClient
  readonly matching?: MatchingClient
  readonly network: Network
  readonly stelaAddress: string

  constructor(opts: StelaSdkOptions) {
    this.network = resolveNetwork(opts.network)
    this.stelaAddress = opts.stelaAddress ?? STELA_ADDRESS[this.network]

    this.inscriptions = new InscriptionClient({
      stelaAddress: this.stelaAddress,
      provider: opts.provider,
      account: opts.account,
    })

    this.shares = new ShareClient({
      stelaAddress: this.stelaAddress,
      provider: opts.provider,
    })

    const stelaContract = new Contract(stelaAbi, this.stelaAddress, opts.provider)
    this.locker = new LockerClient(stelaContract, opts.provider, opts.account)

    this.api = new ApiClient({ baseUrl: opts.apiBaseUrl })

    if (opts.matchingEngineUrl) {
      this.matching = new MatchingClient({ baseUrl: opts.matchingEngineUrl })
    }
  }
}
