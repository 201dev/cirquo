import { internalQuery } from './_generated/server'
import { rescueItemStatus } from './schema'

export const listByStatus = internalQuery({
  args: { status: rescueItemStatus },
  handler: async (ctx, { status }) => ctx.db
    .query('surplusItems')
    .withIndex('by_status', (q) => q.eq('status', status))
    .collect(),
})
