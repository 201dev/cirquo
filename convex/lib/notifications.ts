import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

const PRIVATE_VALUE = /pickup.?code|password|token|payload|secret|credential/i

export async function createNotification(ctx: MutationCtx, input: {
  userId: Id<'users'>
  type: string
  title: string
  body: string
  href?: string
  visibleAt?: number
}) {
  if (PRIVATE_VALUE.test(`${input.title} ${input.body} ${input.href ?? ''}`)) {
    throw new Error('Notification contains a forbidden private field name.')
  }
  const now = Date.now()
  return ctx.db.insert('notifications', { ...input, visibleAt: input.visibleAt ?? now, createdAt: now })
}
