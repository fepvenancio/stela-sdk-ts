import { describe, it, expect } from 'vitest'
import { normalizeOrderData, parseOrderRow } from '../../src/utils/order.js'

describe('normalizeOrderData', () => {
  it('handles camelCase keys', () => {
    const result = normalizeOrderData({
      borrower: '0x123',
      debtAssets: [{ asset_address: '0xA', asset_type: 'ERC20', value: '100', token_id: '0' }],
      interestAssets: [],
      collateralAssets: [{ asset_address: '0xB', asset_type: 'ERC721', value: '0', token_id: '1' }],
      duration: '86400',
      deadline: '9999999',
      multiLender: true,
    })
    expect(result.borrower).toBe('0x123')
    expect(result.debtAssets).toHaveLength(1)
    expect(result.collateralAssets).toHaveLength(1)
    expect(result.multiLender).toBe(true)
  })

  it('handles snake_case keys', () => {
    const result = normalizeOrderData({
      borrower: '0x456',
      debt_assets: [{ asset_address: '0xC', asset_type: 'ERC20', value: '200', token_id: '0' }],
      interest_assets: [],
      collateral_assets: [],
      multi_lender: false,
    })
    expect(result.borrower).toBe('0x456')
    expect(result.debtAssets).toHaveLength(1)
    expect(result.multiLender).toBe(false)
  })

  it('defaults missing fields', () => {
    const result = normalizeOrderData({})
    expect(result.borrower).toBe('')
    expect(result.debtAssets).toEqual([])
    expect(result.duration).toBe('0')
    expect(result.deadline).toBe('0')
    expect(result.multiLender).toBe(false)
  })
})

describe('parseOrderRow', () => {
  it('parses JSON string order_data', () => {
    const row = {
      id: 'order-1',
      status: 'pending',
      borrower_signature: '["0xabc", "0xdef"]',
      nonce: '5',
      order_data: JSON.stringify({
        borrower: '0x123',
        debtAssets: [{ asset_address: '0xA', asset_type: 'ERC20', value: '100', token_id: '0' }],
        interestAssets: [],
        collateralAssets: [{ asset_address: '0xB', asset_type: 'ERC721', value: '0', token_id: '1' }],
        duration: '86400',
        deadline: '9999999',
        multiLender: false,
        nonce: '5',
      }),
    }
    const result = parseOrderRow(row)
    expect(result.borrower_signature).toBe('["0xabc", "0xdef"]')
    const od = result.order_data as Record<string, unknown>
    expect(od.borrower).toBe('0x123')
    expect(od.debtCount).toBe(1)
    expect(od.collateralCount).toBe(1)
  })

  it('strips borrower_signature for non-pending orders', () => {
    const row = {
      id: 'order-2',
      status: 'settled',
      borrower_signature: '["0xabc", "0xdef"]',
      nonce: '5',
      order_data: JSON.stringify({
        borrower: '0x123',
        debtAssets: [],
        collateralAssets: [],
      }),
    }
    const result = parseOrderRow(row)
    expect(result.borrower_signature).toBeUndefined()
  })

  it('handles object order_data', () => {
    const row = {
      id: 'order-3',
      status: 'pending',
      nonce: '1',
      order_data: {
        borrower: '0x789',
        debt_assets: [{ asset_address: '0xD', asset_type: 'ERC20', value: '500', token_id: '0' }],
      },
    }
    const result = parseOrderRow(row)
    const od = result.order_data as Record<string, unknown>
    expect(od.borrower).toBe('0x789')
    expect(od.debtCount).toBe(1)
  })

  it('sanitizes malformed assets', () => {
    const row = {
      id: 'order-4',
      status: 'pending',
      nonce: '1',
      order_data: JSON.stringify({
        debtAssets: [null, 'not-an-object', { asset_address: '0xA', asset_type: 'ERC20', value: '100', token_id: '0' }],
      }),
    }
    const result = parseOrderRow(row)
    const od = result.order_data as Record<string, unknown>
    expect(od.debtCount).toBe(1) // only the valid one
  })
})
