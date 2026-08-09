'use node'

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const N = 16_384
const R = 8
const P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N, r: R, p: P, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => error ? reject(error) : resolve(derivedKey),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const derivedKey = await derivePassword(password, salt)

  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${derivedKey.toString('base64')}`
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
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

  const salt = Buffer.from(saltBase64, 'base64')
  const expected = Buffer.from(hashBase64, 'base64')

  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) {
    return false
  }

  const actual = await derivePassword(password, salt)
  return timingSafeEqual(actual, expected)
}
