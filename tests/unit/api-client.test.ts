import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient, ApiError } from '../../src/client/api-client.js'

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  })
}

describe('ApiClient', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('uses default base URL', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient()
    await client.listInscriptions()
    expect(globalThis.fetch).toHaveBeenCalledWith('https://stela-dapp.xyz/api/inscriptions')
  })

  it('uses custom base URL', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient({ baseUrl: 'http://localhost:3000/api' })
    await client.listInscriptions()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/api/inscriptions')
  })

  it('strips trailing slash from baseUrl', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient({ baseUrl: 'http://localhost:3000/api/' })
    await client.listInscriptions()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/api/inscriptions')
  })

  it('passes query params for listInscriptions', async () => {
    const data = { data: [], meta: { page: 2, limit: 10, total: 50 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient()
    await client.listInscriptions({ status: 'open', page: 2, limit: 10 })
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('status=open')
    expect(url).toContain('page=2')
    expect(url).toContain('limit=10')
  })

  it('returns typed response for listInscriptions', async () => {
    const mockData = {
      data: [{ id: '0x1', creator: '0xabc', status: 'open', assets: [] }],
      meta: { page: 1, limit: 20, total: 1 },
    }
    globalThis.fetch = mockFetch(mockData) as unknown as typeof fetch
    const client = new ApiClient()
    const result = await client.listInscriptions()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('0x1')
    expect(result.meta.total).toBe(1)
  })

  it('returns typed response for getInscription', async () => {
    const mockData = { data: { id: '0x1', creator: '0xabc', status: 'open', assets: [] } }
    globalThis.fetch = mockFetch(mockData) as unknown as typeof fetch
    const client = new ApiClient()
    const result = await client.getInscription('0x1')
    expect(result.data.id).toBe('0x1')
  })

  it('calls correct URL for getInscription', async () => {
    const mockData = { data: { id: '0x1' } }
    globalThis.fetch = mockFetch(mockData) as unknown as typeof fetch
    const client = new ApiClient()
    await client.getInscription('0x1')
    expect(globalThis.fetch).toHaveBeenCalledWith('https://stela-dapp.xyz/api/inscriptions/0x1')
  })

  it('throws ApiError on non-OK response', async () => {
    globalThis.fetch = mockFetch(null, 404) as unknown as typeof fetch
    const client = new ApiClient()
    await expect(client.getInscription('0x999')).rejects.toThrow(ApiError)
    try {
      await client.getInscription('0x999')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(404)
      expect(apiErr.url).toContain('/inscriptions/0x999')
    }
  })

  it('calls getTreasuryView with address', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient()
    await client.getTreasuryView('0xabc')
    expect(globalThis.fetch).toHaveBeenCalledWith('https://stela-dapp.xyz/api/treasury?address=0xabc')
  })

  it('calls getShareBalances with address', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient()
    await client.getShareBalances('0xabc')
    expect(globalThis.fetch).toHaveBeenCalledWith('https://stela-dapp.xyz/api/shares?address=0xabc')
  })

  it('calls getLockers with address', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient()
    await client.getLockers('0xabc')
    expect(globalThis.fetch).toHaveBeenCalledWith('https://stela-dapp.xyz/api/lockers?address=0xabc')
  })

  it('calls getInscriptionEvents', async () => {
    const data = { data: [], meta: { page: 1, limit: 20, total: 0 } }
    globalThis.fetch = mockFetch(data) as unknown as typeof fetch
    const client = new ApiClient()
    await client.getInscriptionEvents('0x1')
    expect(globalThis.fetch).toHaveBeenCalledWith('https://stela-dapp.xyz/api/inscriptions/0x1/events')
  })
})
