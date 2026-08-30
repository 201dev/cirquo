import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export function recordAdminAction(ctx: MutationCtx, input: {
  adminId: Id<'users'>
  action: string
  targetUserId: Id<'users'>
  targetEntityId?: string
  previousStatus: string
  reasonOrNote?: string
}) {
  return ctx.db.insert('adminActions', { ...input, occurredAt: Date.now() })
}
