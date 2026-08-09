import assert from 'node:assert/strict'

import {
  normalizeWeightDeltaGrams,
  serializeLedgerMetadata,
} from '../convex/lib/ledger.ts'

assert.equal(normalizeWeightDeltaGrams(1_250.4), 1_250)
assert.equal(normalizeWeightDeltaGrams(-1_250.6), -1_251)
assert.equal(
  serializeLedgerMetadata({ quantity: 2, reason: 'pickup' }),
  '{"quantity":2,"reason":"pickup"}',
)
assert.equal(serializeLedgerMetadata(undefined), undefined)

console.log('Ledger normalization and metadata serialization checks passed.')
