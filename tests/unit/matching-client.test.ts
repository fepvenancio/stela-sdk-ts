import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MatchingClient, MatchingEngineError } from '../../src/client/matching-client.js'
import type { SignedOrder, TakerIntent } from '../../src/types/matching.js'

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 201 ? 'Created' : 'Not Found',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

const sampleOrder: SignedOrder = {
  maker: '0x123',
  allowed_taker: '0x0',
  inscription_id: '42',
  bps: '10000',
  deadline: 1700000000,
  nonce: '0x1',
  min_fill_bps: '1000',
}

const sampleSignature: [string, string] = ['0xabc', '0xdef']

describe('MatchingClient', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('uses default base URL (http://localhost:3001)', async () => {
    const data = { matches: [], total_available_bps: 0, fully_covered: false }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new MatchingClient()
    await client.matchIntent({ action: 'Borrow', bps: 1000, inscription_id: '1' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/match',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses custom base URL', async () => {
    const data = { matches: [], total_available_bps: 0, fully_covered: false }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new MatchingClient({ baseUrl: 'http://engine:4000' })
    await client.matchIntent({ action: 'Lend', bps: 500, inscription_id: '2' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://engine:4000/match',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('strips trailing slash from baseUrl', async () => {
    const data = { matches: [], total_available_bps: 0, fully_covered: false }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new MatchingClient({ baseUrl: 'http://engine:4000/' })
    await client.matchIntent({ action: 'Borrow', bps: 1000, inscription_id: '1' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://engine:4000/match',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('submitOrder calls POST /orders with correct body', async () => {
    const mockRecord = { id: 'uuid-1', order_hash: '0xhash', ...sampleOrder }
    globalThis.fetch = mockFetch(mockRecord, 201) as unknown as typeof fetch
    const client = new MatchingClient()
    const result = await client.submitOrder(sampleOrder, sampleSignature)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/orders',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: sampleOrder, signature: sampleSignature }),
      }),
    )
    expect(result.id).toBe('uuid-1')
  })

  it('matchIntent calls POST /match with intent body', async () => {
    const mockResponse = { matches: [], total_available_bps: 0, fully_covered: false }
    globalThis.fetch = mockFetch(mockResponse) as unknown as typeof fetch
    const client = new MatchingClient()
    const intent: TakerIntent = { action: 'Borrow', bps: 5000, inscription_id: '42' }
    const result = await client.matchIntent(intent)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/match',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(intent),
      }),
    )
    expect(result.fully_covered).toBe(false)
  })

  it('getOrder calls GET /orders/{id}', async () => {
    const mockRecord = { id: 'uuid-1', order_hash: '0xhash' }
    globalThis.fetch = mockFetch(mockRecord) as unknown as typeof fetch
    const client = new MatchingClient()
    const result = await client.getOrder('uuid-1')

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3001/orders/uuid-1')
    expect(result.id).toBe('uuid-1')
  })

  it('cancelOrder calls POST /orders/{id}/cancel with { maker } body', async () => {
    globalThis.fetch = mockFetch(null, 204) as unknown as typeof fetch
    const client = new MatchingClient()
    await client.cancelOrder('uuid-1', '0x123')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/orders/uuid-1/cancel',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maker: '0x123' }),
      }),
    )
  })

  it('throws MatchingEngineError on non-OK response', async () => {
    globalThis.fetch = mockFetch(null, 404) as unknown as typeof fetch
    const client = new MatchingClient()
    await expect(client.getOrder('missing')).rejects.toThrow(MatchingEngineError)

    try {
      await client.getOrder('missing')
    } catch (err) {
      const engineErr = err as MatchingEngineError
      expect(engineErr.status).toBe(404)
      expect(engineErr.url).toContain('/orders/missing')
    }
  })

  it('throws MatchingEngineError on non-OK cancelOrder response', async () => {
    globalThis.fetch = mockFetch(null, 403) as unknown as typeof fetch
    const client = new MatchingClient()
    await expect(client.cancelOrder('uuid-1', '0xwrong')).rejects.toThrow(MatchingEngineError)
  })
})
