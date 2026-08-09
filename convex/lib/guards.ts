import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { hashSessionToken } from './tokens'

export type AuthCtx = QueryCtx | MutationCtx
export type AuthedUser = Doc<'users'>
export type UserRole = AuthedUser['role']

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export async function requireAuth(
  ctx: AuthCtx,
  sessionToken: string | undefined,
): Promise<AuthedUser> {
  if (!sessionToken || !SESSION_TOKEN_PATTERN.test(sessionToken)) {
    throw new ConvexError('AUTH_REQUIRED')
  }

  const tokenHash = await hashSessionToken(sessionToken)
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .unique()

  if (!session) throw new ConvexError('AUTH_REQUIRED')
  if (session.expiresAt <= Date.now()) {
    throw new ConvexError('SESSION_EXPIRED')
  }

  const user = await ctx.db.get(session.userId)
  if (!user) throw new ConvexError('AUTH_REQUIRED')
  if (user.status === 'suspended') {
    throw new ConvexError('ACCOUNT_SUSPENDED')
  }

  return user
}

export async function requireRole(
  ctx: AuthCtx,
  sessionToken: string | undefined,
  allowedRoles: readonly UserRole[],
): Promise<AuthedUser> {
  const user = await requireAuth(ctx, sessionToken)
  if (!allowedRoles.includes(user.role)) throw new ConvexError('FORBIDDEN')
  return user
}

export function requireOwnership<T>(
  user: AuthedUser,
  ownerId: Id<'users'>,
  resource: T | null | undefined,
): T {
  if (!resource || user._id !== ownerId) throw new ConvexError('NOT_FOUND')
  return resource
}
