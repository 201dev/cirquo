import { internalQuery } from './_generated/server'
import { recoveryBatchStatus } from './schema'

export const listByStatus = internalQuery({
  args: { status: recoveryBatchStatus },
  handler: async (ctx, { status }) => ctx.db
    .query('recoveryBatches')
    .withIndex('by_status', (q) => q.eq('status', status))
    .collect(),
})
