'use node'

import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import {
  hashPassword as createPasswordHash,
  verifyPassword as passwordMatches,
} from './lib/password'

export const hashPassword = internalAction({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => createPasswordHash(password),
})

export const verifyPassword = internalAction({
  args: {
    password: v.string(),
    passwordHash: v.string(),
  },
  handler: async (_ctx, { password, passwordHash }) =>
    passwordMatches(password, passwordHash),
})
