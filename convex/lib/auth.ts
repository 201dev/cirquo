import { ConvexError, v } from 'convex/values'

export const registrationRole = v.union(
  v.literal('consumer'),
  v.literal('merchant'),
  v.literal('processor'),
)

export type RegistrationRole = 'consumer' | 'merchant' | 'processor'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateRegistrationInput(
  nameInput: string,
  emailInput: string,
  password: string,
): { name: string; email: string } {
  const name = nameInput.trim()
  const email = normalizeEmail(emailInput)

  if (name.length < 2 || name.length > 80 || !EMAIL_PATTERN.test(email)) {
    throw new ConvexError('VALIDATION_FAILED')
  }

  if (
    password.length < 10 ||
    password.length > 128 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new ConvexError('VALIDATION_FAILED')
  }

  return { name, email }
}
