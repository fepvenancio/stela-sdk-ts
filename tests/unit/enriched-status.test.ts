import { describe, it, expect } from 'vitest'
import {
  enrichStatus,
  getStatusBadgeVariant,
  getStatusLabel,
  getOrderStatusLabel,
  inscriptionMatchesGroup,
  orderMatchesGroup,
  ORDER_STATUS_LABELS,
} from '../../src/utils/status.js'

describe('enrichStatus', () => {
  const nowSeconds = Math.floor(Date.now() / 1000)

  it('returns base status for open inscription', () => {
    expect(enrichStatus({
      status: 'open',
      signed_at: null,
      duration: '86400',
      issued_debt_percentage: '0',
      deadline: String(nowSeconds + 9999),
    })).toBe('open')
  })

  it('returns auctioned when auction_started', () => {
    expect(enrichStatus({
      status: 'filled',
      signed_at: String(nowSeconds - 200000),
      duration: '86400',
      issued_debt_percentage: '10000',
      deadline: '0',
      auction_started: 1,
    })).toBe('auctioned')
  })

  it('returns grace_period for recently expired signed inscription', () => {
    // Signed, fully filled, duration just elapsed (within 24h grace)
    const signedAt = nowSeconds - 86401 // just past duration
    expect(enrichStatus({
      status: 'filled',
      signed_at: String(signedAt),
      duration: '86400',
      issued_debt_percentage: '10000',
      deadline: '0',
    })).toBe('grace_period')
  })

  it('returns overdue for inscription past grace period', () => {
    // Signed, fully filled, duration + grace period elapsed
    const signedAt = nowSeconds - 200000 // well past 86400 + 86400
    expect(enrichStatus({
      status: 'filled',
      signed_at: String(signedAt),
      duration: '86400',
      issued_debt_percentage: '10000',
      deadline: '0',
    })).toBe('overdue')
  })

  it('returns repaid for repaid inscription', () => {
    expect(enrichStatus({
      status: 'repaid',
      signed_at: String(nowSeconds - 1000),
      duration: '86400',
      issued_debt_percentage: '10000',
      deadline: '0',
    })).toBe('repaid')
  })
})

describe('getStatusBadgeVariant', () => {
  it('maps known statuses', () => {
    expect(getStatusBadgeVariant('open')).toBe('open')
    expect(getStatusBadgeVariant('overdue')).toBe('overdue')
    expect(getStatusBadgeVariant('auctioned')).toBe('auctioned')
    expect(getStatusBadgeVariant('grace_period')).toBe('grace_period')
  })

  it('defaults unknown to open', () => {
    expect(getStatusBadgeVariant('bogus')).toBe('open')
  })
})

describe('getStatusLabel', () => {
  it('returns extended labels', () => {
    expect(getStatusLabel('overdue')).toBe('Overdue')
    expect(getStatusLabel('grace_period')).toBe('Grace Period')
  })

  it('returns base labels', () => {
    expect(getStatusLabel('open')).toBe('Open')
    expect(getStatusLabel('filled')).toBe('Filled')
  })
})

describe('order status helpers', () => {
  it('has all expected labels', () => {
    expect(ORDER_STATUS_LABELS.pending).toBe('Pending')
    expect(ORDER_STATUS_LABELS.settled).toBe('Settled')
  })

  it('getOrderStatusLabel works', () => {
    expect(getOrderStatusLabel('matched')).toBe('Matched')
    expect(getOrderStatusLabel('unknown')).toBe('unknown')
  })
})

describe('status groups', () => {
  it('inscriptionMatchesGroup open', () => {
    expect(inscriptionMatchesGroup('open', 'open')).toBe(true)
    expect(inscriptionMatchesGroup('partial', 'open')).toBe(true)
    expect(inscriptionMatchesGroup('filled', 'open')).toBe(false)
  })

  it('inscriptionMatchesGroup active', () => {
    expect(inscriptionMatchesGroup('filled', 'active')).toBe(true)
    expect(inscriptionMatchesGroup('auctioned', 'active')).toBe(true)
    expect(inscriptionMatchesGroup('grace_period', 'active')).toBe(true)
  })

  it('inscriptionMatchesGroup all', () => {
    expect(inscriptionMatchesGroup('anything', 'all')).toBe(true)
  })

  it('orderMatchesGroup', () => {
    expect(orderMatchesGroup('pending', 'open')).toBe(true)
    expect(orderMatchesGroup('matched', 'active')).toBe(true)
    expect(orderMatchesGroup('settled', 'closed')).toBe(true)
    expect(orderMatchesGroup('anything', 'all')).toBe(true)
  })
})
