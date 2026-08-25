import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { hashSessionToken } from './tokens'

export type AuthCtx = QueryCtx | MutationCtx
export type AuthedUser = Doc<'users'>
export type UserRole = AuthedUser['role']

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

export async function resolveAuth(
  ctx: AuthCtx,
  sessionToken: string | undefined,
): Promise<AuthedUser | null> {
  if (!sessionToken || !SESSION_TOKEN_PATTERN.test(sessionToken)) return null

  const tokenHash = await hashSessionToken(sessionToken)
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .unique()

  if (!session) return null
  const user = await ctx.db.get(session.userId)
  if (!user || user.status === 'suspended') return null
  return user
}

export async function requireAuth(
  ctx: AuthCtx,
  sessionToken: string | undefined,
): Promise<AuthedUser> {
  if (!sessionToken || !SESSION_TOKEN_PATTERN.test(sessionToken)) {
    fail('AUTH_REQUIRED', 'Sesi tidak tersedia. Silakan masuk kembali.')
  }

  const tokenHash = await hashSessionToken(sessionToken)
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token_hash', (query) => query.eq('tokenHash', tokenHash))
    .unique()

  if (!session) fail('AUTH_REQUIRED', 'Sesi tidak tersedia. Silakan masuk kembali.')
  if (session.expiresAt <= Date.now()) {
    fail('SESSION_EXPIRED', 'Sesi telah berakhir. Silakan masuk kembali.')
  }

  const user = await ctx.db.get(session.userId)
  if (!user) fail('AUTH_REQUIRED', 'Sesi tidak tersedia. Silakan masuk kembali.')
  if (user.status === 'suspended') {
    fail('ACCOUNT_SUSPENDED', 'Akun ini sedang ditangguhkan.')
  }

  return user
}

export async function requireRole(
  ctx: AuthCtx,
  sessionToken: string | undefined,
  allowedRoles: readonly UserRole[],
): Promise<AuthedUser> {
  const user = await requireAuth(ctx, sessionToken)
  if (!allowedRoles.includes(user.role)) {
    fail('FORBIDDEN', 'Akun ini tidak memiliki izin untuk melakukan tindakan tersebut.')
  }
  return user
}

export function requireOwnership<T>(
  user: AuthedUser,
  ownerId: Id<'users'>,
  resource: T | null | undefined,
): T {
  if (!resource || (user.role !== 'admin' && user._id !== ownerId)) {
    fail('NOT_FOUND', 'Data tidak ditemukan.')
  }
  return resource
}

export async function requireVerifiedMerchant(
  ctx: AuthCtx,
  user: AuthedUser,
): Promise<Doc<'merchants'>> {
  const merchant = await ctx.db
    .query('merchants')
    .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
    .unique()

  if (!merchant) fail('NOT_FOUND', 'Profil Merchant belum tersedia.')
  if (merchant.verificationStatus !== 'verified') {
    fail('NOT_VERIFIED', 'Profil Merchant belum terverifikasi.')
  }
  return merchant
}

export async function requireVerifiedProcessor(
  ctx: AuthCtx,
  user: AuthedUser,
): Promise<Doc<'processors'>> {
  const processor = await ctx.db
    .query('processors')
    .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
    .unique()

  if (!processor) fail('NOT_FOUND', 'Profil Organic Processor belum tersedia.')
  if (processor.verificationStatus !== 'verified') {
    fail('NOT_VERIFIED', 'Profil Organic Processor belum terverifikasi.')
  }
  return processor
}
