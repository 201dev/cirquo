import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireRole } from './lib/guards'
import { recoveryBatchStatus } from './schema'

export const listByStatus = query({
  args: {
    sessionToken: v.optional(v.string()),
    status: recoveryBatchStatus,
  },
  handler: async (ctx, { sessionToken, status }) => {
    const user = await requireRole(ctx, sessionToken, ['processor', 'admin'])

    if (user.role === 'admin') {
      return ctx.db
        .query('recoveryBatches')
        .withIndex('by_status', (index) => index.eq('status', status))
        .order('desc')
        .take(100)
    }

    return ctx.db
      .query('recoveryBatches')
      .withIndex('by_processor', (index) => index.eq('processorId', user._id))
      .filter((query) => query.eq(query.field('status'), status))
      .order('desc')
      .take(100)
  },
})
