import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import {
  hashPassword as createPasswordHash,
  verifyPassword as passwordMatches,
} from './lib/password'

export const hashPassword = internalAction({
  args: { password: v.string() },
  returns: v.string(),
  handler: (_ctx, { password }) => createPasswordHash(password),
})

export const verifyPassword = internalAction({
  args: {
    password: v.string(),
    passwordHash: v.string(),
  },
  returns: v.boolean(),
  handler: (_ctx, { password, passwordHash }) =>
    passwordMatches(password, passwordHash),
})
