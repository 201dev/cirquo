import { internalQuery } from './_generated/server'

export const getPlaceholderSummary = internalQuery({
  args: {},
  handler: () => ({
    rescuedGrams: 2_400,
    recoveredGrams: 7_600,
    residualGrams: 800,
    circularityRate: 93,
    estimated: true,
  }),
})
