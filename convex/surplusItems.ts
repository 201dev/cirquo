import { query } from './_generated/server'

// Public by design: browsing is hard-restricted to active Rescue Items.
export const listByStatus = query({
  args: {},
  handler: async (ctx) => ctx.db
    .query('surplusItems')
    .withIndex('by_status', (index) => index.eq('status', 'active'))
    .order('desc')
    .take(100),
})
