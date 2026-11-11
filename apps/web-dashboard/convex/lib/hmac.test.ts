import { describe, expect, it } from 'vitest'
import {
  buildCanonicalRequest,
  computeHmacSha256Hex,
  sha256Hex,
  timingSafeEqualHex,
} from './hmac'

describe('HMAC request signing', () => {
  it('hashes a known SHA-256 vector', async () => {
    await expect(sha256Hex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('builds the documented canonical request string', () => {
    expect(
      buildCanonicalRequest({
        method: 'post',
        path: '/api/ai/events',
        deviceId: 'PROCESSOR-DEMO-001',
        timestamp: '1700000000',
        nonce: 'nonce-12345678',
        bodyHash: 'a'.repeat(64),
      }),
    ).toBe(
      [
        'v1',
        'POST',
        '/api/ai/events',
        'PROCESSOR-DEMO-001',
        '1700000000',
        'nonce-12345678',
        'a'.repeat(64),
      ].join('\n'),
    )
  })

  it('produces a deterministic signature', async () => {
    const first = await computeHmacSha256Hex('secret', 'message')
    const second = await computeHmacSha256Hex('secret', 'message')
    const different = await computeHmacSha256Hex('secret', 'message!')

    expect(first).toBe(second)
    expect(first).not.toBe(different)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it('compares digests without accepting mismatches', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true)
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false)
    expect(timingSafeEqualHex('abcd', 'abcde')).toBe(false)
    expect(timingSafeEqualHex('', '')).toBe(true)
  })
})
