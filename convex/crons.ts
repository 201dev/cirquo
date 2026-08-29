import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'pickup window expiry',
  { minutes: 5 },
  internal.surplusItems.expirePickupWindows,
  {},
)
crons.interval('circular routing', { minutes: 10 }, internal.recoveryBatches.runRouting, {})

export default crons
