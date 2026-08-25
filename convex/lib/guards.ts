import { ConvexError } from 'convex/values'
import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { hashToken } from './tokens'

type Ctx = QueryCtx | MutationCtx
export type Role = 'consumer' | 'merchant' | 'processor' | 'admin'

function fail(code: string, message: string, details?: Record<string, string | number>): never {
  throw new ConvexError({ code, message, details })
}

/**
 * Resolves a session token to an active user.
 */
export async function requireAuth(ctx: Ctx, sessionToken: string): Promise<Doc<'users'>> {
  if (!sessionToken || sessionToken.length < 20) {
    fail('AUTH_REQUIRED', 'Missing or malformed session token.')
  }

  const tokenHash = await hashToken(sessionToken)
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
    .unique()

  if (!session) fail('AUTH_REQUIRED', 'Session not found.')
  if (session.expiresAt <= Date.now()) fail('SESSION_EXPIRED', 'Session has expired.')

  const user = await ctx.db.get(session.userId)
  if (!user) fail('AUTH_REQUIRED', 'Session refers to a missing user.')
  if (user.status === 'suspended') fail('ACCOUNT_SUSPENDED', 'This account has been suspended.')

  return user
}

export async function requireRole(
  ctx: Ctx,
  sessionToken: string,
  allowed: readonly Role[],
): Promise<Doc<'users'>> {
  const user = await requireAuth(ctx, sessionToken)
  if (!allowed.includes(user.role as Role)) {
    fail('FORBIDDEN', `Role '${user.role}' is not permitted to call this function.`)
  }
  return user
}

export function requireOwnership(
  user: Doc<'users'>,
  ownerId: Id<'users'>,
  resource: string,
): void {
  if (user.role === 'admin') return
  if (user._id !== ownerId) {
    fail('FORBIDDEN', `You do not own this ${resource}.`)
  }
}

export async function requireVerifiedMerchant(
  ctx: Ctx,
  user: Doc<'users'>,
): Promise<Doc<'merchants'>> {
  const merchant = await ctx.db
    .query('merchants')
    .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
    .unique()

  if (!merchant) fail('NOT_FOUND', 'No merchant profile exists for this account.')
  if (merchant.verificationStatus !== 'verified') {
    fail('NOT_VERIFIED', 'Merchant account is not verified.', {
      verificationStatus: merchant.verificationStatus,
    })
  }
  return merchant
}

export async function requireVerifiedProcessor(
  ctx: Ctx,
  user: Doc<'users'>,
): Promise<Doc<'processors'>> {
  const processor = await ctx.db
    .query('processors')
    .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
    .unique()

  if (!processor) fail('NOT_FOUND', 'No processor profile exists for this account.')
  if (processor.verificationStatus !== 'verified') {
    fail('NOT_VERIFIED', 'Processor account is not verified.', {
      verificationStatus: processor.verificationStatus,
    })
  }
  return processor
}
