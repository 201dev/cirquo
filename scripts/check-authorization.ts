import assert from 'node:assert/strict'
import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../convex/_generated/dataModel.ts'
import type { QueryCtx } from '../convex/_generated/server.ts'
import {
  requireAuth,
  requireOwnership,
  requireRole,
} from '../convex/lib/guards.ts'

const SESSION_TOKEN = 'A'.repeat(43)
const USER_ID = 'user-a' as Id<'users'>
const OTHER_USER_ID = 'user-b' as Id<'users'>
const now = Date.now()

const user: Doc<'users'> = {
  _id: USER_ID,
  _creationTime: now,
  name: 'Umar',
  email: 'umar@example.com',
  passwordHash: 'not-returned-by-guards',
  role: 'consumer',
  status: 'active',
  createdAt: now,
}

function mockCtx(expiresAt: number, resolvedUser: Doc<'users'> = user) {
  return {
    db: {
      query: () => ({
        withIndex: (
          _name: string,
          defineRange: (query: { eq: () => unknown }) => unknown,
        ) => {
          defineRange({ eq: () => ({}) })
          return {
            unique: async () => ({ userId: USER_ID, expiresAt }),
          }
        },
      }),
      get: async () => resolvedUser,
    },
  } as unknown as QueryCtx
}

function hasCode(code: string) {
  return (error: unknown) =>
    error instanceof ConvexError && error.data === code
}

assert.equal((await requireAuth(mockCtx(now + 60_000), SESSION_TOKEN))._id, USER_ID)
await assert.rejects(
  requireAuth(mockCtx(now - 1), SESSION_TOKEN),
  hasCode('SESSION_EXPIRED'),
)
await assert.rejects(
  requireAuth(mockCtx(now + 60_000), 'malformed'),
  hasCode('AUTH_REQUIRED'),
)
await assert.rejects(
  requireRole(mockCtx(now + 60_000), SESSION_TOKEN, ['merchant']),
  hasCode('FORBIDDEN'),
)
await assert.rejects(
  requireAuth(
    mockCtx(now + 60_000, { ...user, status: 'suspended' }),
    SESSION_TOKEN,
  ),
  hasCode('ACCOUNT_SUSPENDED'),
)
assert.throws(
  () => requireOwnership(user, OTHER_USER_ID, { id: 'private' }),
  hasCode('NOT_FOUND'),
)

console.log('Authorization guard checks passed.')
