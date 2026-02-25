import type {
  SignedOrder,
  SubmitOrderRequest,
  TakerIntent,
  OrderRecord,
  MatchResponse,
} from '../types/matching.js'

export interface MatchingClientOptions {
  baseUrl?: string
}

/**
 * Error thrown when the matching engine returns a non-OK HTTP response.
 * Mirrors the SDK's existing `ApiError` pattern.
 */
export class MatchingEngineError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly url: string,
  ) {
    super(message)
    this.name = 'MatchingEngineError'
  }
}

/**
 * HTTP client for the Stela matching engine API.
 * Provides typed access to order submission, matching, and cancellation.
 */
export class MatchingClient {
  private baseUrl: string

  constructor(opts?: MatchingClientOptions) {
    this.baseUrl = (opts?.baseUrl ?? 'http://localhost:3001').replace(/\/$/, '')
  }

  /** Submit a signed order with its ECDSA signature. */
  async submitOrder(order: SignedOrder, signature: [string, string]): Promise<OrderRecord> {
    const body: SubmitOrderRequest = { order, signature }
    return this.post<OrderRecord>('/orders', body)
  }

  /** Match a taker intent against available orders. */
  async matchIntent(intent: TakerIntent): Promise<MatchResponse> {
    return this.post<MatchResponse>('/match', intent)
  }

  /** Retrieve an order by UUID. */
  async getOrder(id: string): Promise<OrderRecord> {
    return this.get<OrderRecord>(`/orders/${id}`)
  }

  /** Soft-cancel an order (maker only). */
  async cancelOrder(id: string, maker: string): Promise<void> {
    const url = `${this.baseUrl}/orders/${id}/cancel`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maker }),
    })
    if (!response.ok) {
      throw new MatchingEngineError(
        response.status,
        `Matching engine request failed: ${response.status} ${response.statusText}`,
        url,
      )
    }
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new MatchingEngineError(
        response.status,
        `Matching engine request failed: ${response.status} ${response.statusText}`,
        url,
      )
    }
    return response.json() as Promise<T>
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new MatchingEngineError(
        response.status,
        `Matching engine request failed: ${response.status} ${response.statusText}`,
        url,
      )
    }
    return response.json() as Promise<T>
  }
}
