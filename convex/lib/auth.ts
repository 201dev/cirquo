import { ConvexError, v } from 'convex/values'

export const registrationRole = v.union(
  v.literal('consumer'),
  v.literal('merchant'),
  v.literal('processor'),
)

export type RegistrationRole = 'consumer' | 'merchant' | 'processor'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(field: 'name' | 'email' | 'password', message: string): never {
  throw new ConvexError({ code: 'VALIDATION_FAILED', field, message })
}

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

  if (name.length < 2 || name.length > 80) {
    fail('name', 'Nama harus terdiri dari 2–80 karakter.')
  }
  if (!EMAIL_PATTERN.test(email)) {
    fail('email', 'Masukkan alamat email yang valid.')
  }
  if (password.length < 10 || password.length > 128) {
    fail('password', 'Kata sandi harus terdiri dari 10–128 karakter.')
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    fail('password', 'Kata sandi harus mengandung huruf dan angka.')
  }

  return { name, email }
}
