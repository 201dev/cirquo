import { query } from './_generated/server'

// Public by design: aggregate placeholder data contains no identifiable rows.
export const getPlaceholderSummary = query({
  args: {},
  handler: () => ({
    rescuedGrams: 2_400,
    recoveredGrams: 7_600,
    residualGrams: 800,
    circularityRate: 93,
    estimated: true,
  }),
})
