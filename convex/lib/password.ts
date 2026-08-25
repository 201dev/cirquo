import { scrypt } from '@noble/hashes/scrypt.js'
import { randomBytes } from '@noble/hashes/utils.js'

const N = 16_384
const R = 8
const P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function derivePassword(password: string, salt: Uint8Array): Uint8Array {
  return scrypt(new TextEncoder().encode(password), salt, {
    N,
    r: R,
    p: P,
    dkLen: KEY_LENGTH,
  })
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const derivedKey = derivePassword(password, salt)

  return `scrypt$${N}$${R}$${P}$${encodeBase64(salt)}$${encodeBase64(derivedKey)}`
}

export function verifyPassword(
  password: string,
  storedHash: string,
): boolean {
  const [algorithm, n, r, p, saltBase64, hashBase64] = storedHash.split('$')

  if (
    algorithm !== 'scrypt' ||
    Number(n) !== N ||
    Number(r) !== R ||
    Number(p) !== P ||
    !saltBase64 ||
    !hashBase64
  ) {
    return false
  }

  const salt = decodeBase64(saltBase64)
  const expected = decodeBase64(hashBase64)

  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) {
    return false
  }

  const actual = derivePassword(password, salt)
  let difference = actual.length ^ expected.length

  for (let index = 0; index < Math.min(actual.length, expected.length); index++) {
    difference |= actual[index] ^ expected[index]
  }

  return difference === 0
}
