import assert from 'node:assert/strict'

import { hashPassword, verifyPassword } from '../convex/lib/password.ts'
import { isSessionActive } from '../convex/lib/tokens.ts'

const passwordHash = await hashPassword('Circular2026')

assert.equal(await verifyPassword('Circular2026', passwordHash), true)
assert.equal(await verifyPassword('Incorrect2026', passwordHash), false)

const now = Date.now()
assert.equal(isSessionActive(now + 1, now), true)
assert.equal(isSessionActive(now, now), false)
assert.equal(isSessionActive(now - 1, now), false)

console.log('Auth password verification and session expiry checks passed.')
