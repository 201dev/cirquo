export function parseMidtransIdrAmount(value: string) {
  if (!/^\d+(?:\.00)?$/.test(value)) return null
  const amount = Number(value.split('.')[0])
  return Number.isSafeInteger(amount) ? amount : null
}

export async function isValidMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string,
) {
  const payload = new TextEncoder().encode(
    `${orderId}${statusCode}${grossAmount}${serverKey}`,
  )
  const hash = await crypto.subtle.digest('SHA-512', payload)
  const actual = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return actual === signatureKey
}
