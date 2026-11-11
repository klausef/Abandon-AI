const encoder = new TextEncoder()

export const SIGNATURE_VERSION = 'v1'

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let hex = ''
  for (const byte of view) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toHex(digest)
}

export async function computeHmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message),
  )
  return toHex(signature)
}

export interface CanonicalRequestInput {
  method: string
  path: string
  deviceId: string
  /** Unix timestamp in seconds, as sent by the processor. */
  timestamp: string
  nonce: string
  bodyHash: string
}

/**
 * Canonical string signed by the processor:
 *
 *   v1
 *   POST
 *   /api/ai/events
 *   <device id>
 *   <unix timestamp seconds>
 *   <nonce>
 *   <sha256 hex of the exact request body>
 */
export function buildCanonicalRequest(input: CanonicalRequestInput): string {
  return [
    SIGNATURE_VERSION,
    input.method.toUpperCase(),
    input.path,
    input.deviceId,
    input.timestamp,
    input.nonce,
    input.bodyHash,
  ].join('\n')
}

/** Compares two hex digests without early exit on the first mismatching byte. */
export function timingSafeEqualHex(first: string, second: string): boolean {
  const length = Math.max(first.length, second.length)
  let mismatch = first.length === second.length ? 0 : 1
  for (let index = 0; index < length; index += 1) {
    const firstCode = first.charCodeAt(index) || 0
    const secondCode = second.charCodeAt(index) || 0
    mismatch |= firstCode ^ secondCode
  }
  return mismatch === 0
}
