import { describe, expect, test } from 'bun:test'
import { summariseLedger } from '../src/lib/impact'
import { checkItemLedgerIntegrity, type LedgerIntegrityEvent } from '../src/lib/ledger-integrity'

function inspect(status: string, entries: LedgerIntegrityEvent[]) {
  return checkItemLedgerIntegrity(status, entries, summariseLedger(entries))
}

describe('ledger integrity', () => {
  test('accepts a complete conserved terminal flow', () => {
    const entries: LedgerIntegrityEvent[] = [
      { id: 'listed', surplusItemId: 'item', eventType: 'LISTED', weightDeltaGrams: 500, occurredAt: 1 },
      { id: 'paid', surplusItemId: 'item', eventType: 'PAID', weightDeltaGrams: 0, occurredAt: 2, orderId: 'order' },
      { id: 'rescued', surplusItemId: 'item', eventType: 'RESCUED', weightDeltaGrams: -500, occurredAt: 3, orderId: 'order', metadata: JSON.stringify({ quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000 }) },
    ]
    expect(inspect('closed', entries)).toEqual([])
  })

  test('flags conservation, terminal completeness, and impossible ordering', () => {
    const entries: LedgerIntegrityEvent[] = [
      { id: 'rescued', surplusItemId: 'item', eventType: 'RESCUED', weightDeltaGrams: -400, occurredAt: 1, orderId: 'order', metadata: JSON.stringify({ quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000 }) },
      { id: 'listed', surplusItemId: 'item', eventType: 'LISTED', weightDeltaGrams: 500, occurredAt: 2 },
      { id: 'processed', surplusItemId: 'item', eventType: 'PROCESSED', weightDeltaGrams: -50, occurredAt: 3, recoveryBatchId: 'batch', metadata: JSON.stringify({ outputType: 'compost', outputWeightGrams: 50, residualWeightGrams: 0 }) },
    ]
    const codes = inspect('residual', entries).map((issue) => issue.code)
    expect(codes).toContain('EVENT_BEFORE_LISTED')
    expect(codes).toContain('RESCUED_BEFORE_PAID')
    expect(codes).toContain('PROCESSED_BEFORE_INTAKE')
    expect(codes).toContain('MISSING_TERMINAL_EVENT')
    expect(codes).toContain('WEIGHT_NOT_CONSERVED')
  })
})
