import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'
import {
  TEST_DEVICE_ID,
  TEST_EVENT_PATH,
  TEST_PROCESSOR_SECRET,
  detectionEvent,
  potentialIncidentEvent,
  signEventRequest,
  type SignedRequest,
} from './testSupport'

const modules = import.meta.glob('./**/*.ts')

type TestConvex = Awaited<ReturnType<typeof setup>>

async function setup() {
  const t = convexTest(schema, modules)
  await t.mutation(internal.development.seedReferenceData, {})
  return t
}

async function post(t: TestConvex, signed: SignedRequest) {
  return await t.fetch(TEST_EVENT_PATH, {
    method: 'POST',
    headers: signed.headers,
    body: signed.bodyText,
  })
}

beforeAll(() => {
  process.env.PROCESSOR_SHARED_SECRET = TEST_PROCESSOR_SECRET
  delete process.env.PROCESSOR_DEVICE_ID
  delete process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS
  delete process.env.PROCESSOR_MAX_REQUEST_BYTES
})

describe('POST /api/ai/events authentication', () => {
  it('exposes an unauthenticated health check', async () => {
    const t = await setup()
    const response = await t.fetch('/api/ai/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: 'campus-safety-convex-ingestion',
    })
  })

  it('rejects requests without authentication headers', async () => {
    const t = await setup()
    const response = await t.fetch(TEST_EVENT_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(detectionEvent()),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'MISSING_AUTHENTICATION' },
    })
  })

  it('rejects an invalid signature', async () => {
    const t = await setup()
    const signed = await signEventRequest({
      body: detectionEvent(),
      secret: 'wrong-processor-secret-0123456789abcdef',
    })

    const response = await post(t, signed)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_SIGNATURE' },
    })
  })

  it('rejects a stale request timestamp', async () => {
    const t = await setup()
    const signed = await signEventRequest({
      body: detectionEvent(),
      timestampSeconds: Math.floor(Date.now() / 1000) - 3_600,
    })

    const response = await post(t, signed)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'STALE_REQUEST' },
    })
  })

  it('retains a nonce for the full configured clock-skew replay window', async () => {
    const t = await setup()
    const previous = process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS
    process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS = '3600'
    const timestampSeconds = Math.floor(Date.now() / 1000) + 3_590
    const signed = await signEventRequest({
      body: detectionEvent({
        event_id: 'evt-long-skew-001',
        idempotency_key: 'idem-long-skew-001',
      }),
      timestampSeconds,
    })

    try {
      const response = await post(t, signed)
      expect(response.status).toBe(201)

      const nonce = await t.run(async (ctx) =>
        ctx.db
          .query('ingestionNonces')
          .withIndex('by_nonce', (query) => query.eq('nonce', signed.nonce))
          .unique(),
      )
      expect(nonce?.expiresAt).toBe(timestampSeconds * 1000 + 3_601_000)
    } finally {
      if (previous === undefined) {
        delete process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS
      } else {
        process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS = previous
      }
    }
  })

  it('rejects a replayed nonce', async () => {
    const t = await setup()
    const signed = await signEventRequest({ body: detectionEvent() })

    expect((await post(t, signed)).status).toBe(201)

    const replay = await post(t, signed)
    expect(replay.status).toBe(401)
    await expect(replay.json()).resolves.toMatchObject({
      error: { code: 'NONCE_REPLAY' },
    })
  })

  it('rejects unregistered devices', async () => {
    const t = await setup()
    const signed = await signEventRequest({
      body: detectionEvent({
        event_id: 'evt-unknown-device-001',
        idempotency_key: 'idem-unknown-device-001',
        processor_device_id: 'PROCESSOR-UNKNOWN-001',
      }),
      deviceId: 'PROCESSOR-UNKNOWN-001',
    })

    const response = await post(t, signed)
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'DEVICE_NOT_REGISTERED' },
    })
  })

  it('rejects revoked devices', async () => {
    const t = await setup()
    const processor = await t.run(async (ctx) =>
      ctx.db
        .query('processorDevices')
        .withIndex('by_deviceId', (query) =>
          query.eq('deviceId', TEST_DEVICE_ID),
        )
        .unique(),
    )
    expect(processor).not.toBeNull()

    await t
      .withIdentity({ tokenIdentifier: 'demo:administrator' })
      .mutation(api.processors.setStatus, {
        processorId: processor!._id,
        status: 'revoked',
      })

    const response = await post(
      t,
      await signEventRequest({ body: detectionEvent() }),
    )
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'DEVICE_REVOKED' },
    })
  })

  it('rejects a payload that claims a different device', async () => {
    const t = await setup()
    const admin = t.withIdentity({
      tokenIdentifier: 'demo:administrator',
    })

    await admin.mutation(api.processors.register, {
      deviceId: 'PROCESSOR-SECOND-001',
      name: 'Second test processor',
      description: 'Test registration.',
    })

    const signed = await signEventRequest({
      body: detectionEvent({
        event_id: 'evt-device-mismatch-001',
        idempotency_key: 'idem-device-mismatch-001',
        processor_device_id: TEST_DEVICE_ID,
      }),
      deviceId: 'PROCESSOR-SECOND-001',
    })

    const response = await post(t, signed)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'DEVICE_MISMATCH' },
    })
  })

  it('fails closed when no processor secret is configured', async () => {
    const t = await setup()
    const signed = await signEventRequest({ body: detectionEvent() })
    const secret = process.env.PROCESSOR_SHARED_SECRET
    delete process.env.PROCESSOR_SHARED_SECRET

    try {
      const response = await post(t, signed)
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'INGESTION_NOT_CONFIGURED' },
      })
    } finally {
      process.env.PROCESSOR_SHARED_SECRET = secret
    }
  })

  it('rejects unsupported content types', async () => {
    const t = await setup()
    const signed = await signEventRequest({
      body: detectionEvent(),
      contentType: 'text/plain',
    })

    const response = await post(t, signed)
    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE' },
    })

    const lookalike = await post(
      t,
      await signEventRequest({
        body: detectionEvent(),
        contentType: 'application/json-patch+json',
      }),
    )
    expect(lookalike.status).toBe(415)
  })

  it('rejects oversized bodies before parsing', async () => {
    const t = await setup()
    const signed = await signEventRequest({
      body: detectionEvent(),
      bodyOverride: 'x'.repeat(2_048),
    })

    const previous = process.env.PROCESSOR_MAX_REQUEST_BYTES
    process.env.PROCESSOR_MAX_REQUEST_BYTES = '1024'

    try {
      const response = await post(t, signed)
      expect(response.status).toBe(413)
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'PAYLOAD_TOO_LARGE' },
      })
    } finally {
      if (previous === undefined) {
        delete process.env.PROCESSOR_MAX_REQUEST_BYTES
      } else {
        process.env.PROCESSOR_MAX_REQUEST_BYTES = previous
      }
    }
  })
})

describe('POST /api/ai/events idempotency', () => {
  it('returns the original result for an exact retry', async () => {
    const t = await setup()
    const body = potentialIncidentEvent()

    const first = await post(t, await signEventRequest({ body }))
    expect(first.status).toBe(201)
    const firstBody = (await first.json()) as {
      incident_id: string
      incident_created: boolean
    }
    expect(firstBody.incident_created).toBe(true)

    const retry = await post(t, await signEventRequest({ body }))
    expect(retry.status).toBe(200)
    const retryBody = (await retry.json()) as {
      status: string
      incident_id: string
      incident_created?: boolean
    }
    expect(retryBody.status).toBe('duplicate')
    expect(retryBody.incident_id).toBe(firstBody.incident_id)

    const counts = await t.run(async (ctx) => ({
      incidents: (await ctx.db.query('incidents').collect()).length,
      detections: (await ctx.db.query('detections').collect()).length,
      receipts: (await ctx.db.query('ingestionReceipts').collect()).length,
    }))
    expect(counts).toEqual({ incidents: 1, detections: 1, receipts: 1 })
  })

  it('rejects reusing an idempotency key with different content', async () => {
    const t = await setup()
    const body = potentialIncidentEvent()

    expect(
      (await post(t, await signEventRequest({ body }))).status,
    ).toBe(201)

    const changed = potentialIncidentEvent({
      confidence: 0.42,
      occurred_at: new Date().toISOString(),
    })
    const response = await post(
      t,
      await signEventRequest({ body: changed }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'IDEMPOTENCY_CONFLICT' },
    })
  })
})

describe('POST /api/ai/events validation', () => {
  it('rejects invalid confidence values', async () => {
    const t = await setup()
    const response = await post(
      t,
      await signEventRequest({
        body: detectionEvent({ confidence: 1.5 }),
      }),
    )

    expect(response.status).toBe(422)
    const body = (await response.json()) as {
      error: { code: string; issues?: string[] }
    }
    expect(body.error.code).toBe('INVALID_EVENT')
    expect(body.error.issues?.join(' ')).toContain('confidence')
  })

  it('rejects impossible ISO-8601 calendar dates', async () => {
    const t = await setup()
    const response = await post(
      t,
      await signEventRequest({
        body: detectionEvent({
          event_id: 'evt-invalid-date-001',
          idempotency_key: 'idem-invalid-date-001',
          occurred_at: '2026-02-30T01:00:00Z',
        }),
      }),
    )

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_EVENT' },
    })
  })

  it('rejects bounding boxes outside the normalized frame', async () => {
    const t = await setup()
    const response = await post(
      t,
      await signEventRequest({
        body: detectionEvent({
          bounding_box: { x: 0.8, y: 0.2, width: 0.5, height: 0.2 },
        }),
      }),
    )

    expect(response.status).toBe(422)
  })

  it('rejects unknown event types and extra fields', async () => {
    const t = await setup()
    const unknownType = await post(
      t,
      await signEventRequest({
        body: detectionEvent({ event_type: 'mystery_event' }),
      }),
    )
    expect(unknownType.status).toBe(422)

    const extraField = await post(
      t,
      await signEventRequest({
        body: detectionEvent({
          event_id: 'evt-extra-field-001',
          idempotency_key: 'idem-extra-field-001',
          image_base64: 'not-allowed',
        }),
      }),
    )
    expect(extraField.status).toBe(422)
  })

  it('rejects person-only potential incidents', async () => {
    const t = await setup()
    const response = await post(
      t,
      await signEventRequest({
        body: potentialIncidentEvent({
          event_id: 'evt-person-incident-001',
          idempotency_key: 'idem-person-incident-001',
          object_class: 'person',
        }),
      }),
    )

    expect(response.status).toBe(422)
  })

  it('rejects unknown cameras', async () => {
    const t = await setup()
    const response = await post(
      t,
      await signEventRequest({
        body: potentialIncidentEvent({
          event_id: 'evt-unknown-camera-001',
          idempotency_key: 'idem-unknown-camera-001',
          camera_id: 'CAM-999',
        }),
      }),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'CAMERA_NOT_FOUND' },
    })
  })

  it('rejects unknown and mismatched monitoring zones', async () => {
    const t = await setup()

    const unknown = await post(
      t,
      await signEventRequest({
        body: detectionEvent({
          event_id: 'evt-unknown-zone-001',
          idempotency_key: 'idem-unknown-zone-001',
          monitoring_zone_id: 'ZONE-999',
        }),
      }),
    )
    expect(unknown.status).toBe(404)
    await expect(unknown.json()).resolves.toMatchObject({
      error: { code: 'ZONE_NOT_FOUND' },
    })

    const mismatched = await post(
      t,
      await signEventRequest({
        body: detectionEvent({
          event_id: 'evt-zone-mismatch-001',
          idempotency_key: 'idem-zone-mismatch-001',
          monitoring_zone_id: 'ZONE-DEMO-002',
        }),
      }),
    )
    expect(mismatched.status).toBe(422)
    await expect(mismatched.json()).resolves.toMatchObject({
      error: { code: 'ZONE_CAMERA_MISMATCH' },
    })
  })

  it('rejects events for cameras with monitoring disabled', async () => {
    const t = await setup()
    const camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )
    expect(camera).not.toBeNull()

    await t
      .withIdentity({ tokenIdentifier: 'demo:administrator' })
      .mutation(api.cameras.setMonitoringEnabled, {
        cameraId: camera!._id,
        enabled: false,
      })

    const response = await post(
      t,
      await signEventRequest({
        body: detectionEvent({
          event_id: 'evt-monitoring-off-001',
          idempotency_key: 'idem-monitoring-off-001',
        }),
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'CAMERA_MONITORING_DISABLED' },
    })
  })
})
