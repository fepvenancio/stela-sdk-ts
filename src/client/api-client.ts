import type {
  InscriptionRow,
  AssetRow,
  ApiListResponse,
  ApiDetailResponse,
  TreasuryAsset,
  ShareBalance,
  LockerInfo,
} from '../types/api.js'

export interface ApiClientOptions {
  baseUrl?: string
}

export interface ListInscriptionsParams {
  status?: string
  address?: string
  page?: number
  limit?: number
}

/**
 * HTTP client for the Stela indexer API.
 * Provides typed access to indexed inscription data, treasury views, and locker info.
 */
export class ApiClient {
  private baseUrl: string

  constructor(opts?: ApiClientOptions) {
    this.baseUrl = (opts?.baseUrl ?? 'https://stela-dapp.xyz/api').replace(/\/$/, '')
  }

  /** List inscriptions with optional filters */
  async listInscriptions(params?: ListInscriptionsParams): Promise<ApiListResponse<InscriptionRow>> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.address) query.set('address', params.address)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return this.get<ApiListResponse<InscriptionRow>>(`/inscriptions${qs ? `?${qs}` : ''}`)
  }

  /** Get a single inscription by ID */
  async getInscription(id: string): Promise<ApiDetailResponse<InscriptionRow>> {
    return this.get<ApiDetailResponse<InscriptionRow>>(`/inscriptions/${id}`)
  }

  /** Get events for a specific inscription */
  async getInscriptionEvents(id: string): Promise<ApiListResponse<InscriptionEventRow>> {
    return this.get<ApiListResponse<InscriptionEventRow>>(`/inscriptions/${id}/events`)
  }

  /** Get treasury asset balances for an address */
  async getTreasuryView(address: string): Promise<ApiListResponse<TreasuryAsset>> {
    const query = new URLSearchParams({ address })
    return this.get<ApiListResponse<TreasuryAsset>>(`/treasury?${query}`)
  }

  /** Get locker info for inscriptions of an address */
  async getLockers(address: string): Promise<ApiListResponse<LockerInfo>> {
    const query = new URLSearchParams({ address })
    return this.get<ApiListResponse<LockerInfo>>(`/lockers?${query}`)
  }

  /** Get share balances for an address */
  async getShareBalances(address: string): Promise<ApiListResponse<ShareBalance>> {
    const query = new URLSearchParams({ address })
    return this.get<ApiListResponse<ShareBalance>>(`/shares?${query}`)
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new ApiError(response.status, `API request failed: ${response.status} ${response.statusText}`, url)
    }
    return response.json() as Promise<T>
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly url: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Shape of an inscription event row from the API */
export interface InscriptionEventRow {
  id: number
  inscription_id: string
  event_type: string
  tx_hash: string
  block_number: number
  timestamp: string | null
  data: Record<string, unknown> | null
}
