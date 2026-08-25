import { scrypt } from '@noble/hashes/scrypt.js'
import { randomBytes } from '@noble/hashes/utils.js'

const N = 16384, r = 8, p = 1, DK_LEN = 32

function b64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const dk = scrypt(new TextEncoder().encode(plain), salt, { N, r, p, dkLen: DK_LEN })
  return `scrypt$${N}$${r}$${p}$${b64(salt)}$${b64(dk)}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, sN, sr, sp, saltB64, hashB64] = parts
  const salt = unb64(saltB64)
  const expected = unb64(hashB64)
  const dk = scrypt(new TextEncoder().encode(plain), salt, {
    N: Number(sN), r: Number(sr), p: Number(sp), dkLen: expected.length,
  })
  // constant-time comparison
  let diff = dk.length ^ expected.length
  for (let i = 0; i < Math.min(dk.length, expected.length); i++) diff |= dk[i] ^ expected[i]
  return diff === 0
}
