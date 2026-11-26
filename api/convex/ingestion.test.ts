import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { internal } from './_generated/api'
import schema from './schema'
import {
  TEST_DEVICE_ID,
  TEST_EVENT_PATH,
  TEST_PROCESSOR_SECRET,
  detectionEvent,
  heartbeatEvent,
  modelInformationEvent,
  personAssociationEvent,
  potentialIncidentEvent,
  signEventRequest,
  trackSummaryEvent,
  type SignedRequest,
} from './testSupport'

const modules = import.meta.glob('./**/*.ts')

type TestConvex = Awaited<ReturnType<typeof setup>>

async function setup() {
  const t = convexTest(schema, modules)
  await t.mutation(internal.development.seedReferenceData, {})
  return t
}

async function post(t: TestConvex, body: Record<string, unknown>) {
  const signed: SignedRequest = await signEventRequest({ body })
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

describe('processor heartbeat ingestion', () => {
  it('records a heartbeat and updates the camera activity timestamp', async () => {
    const t = await setup()
    const before = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )

    const response = await post(t, heartbeatEvent())
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      status: string
      result_ref: string
    }
    expect(body.status).toBe('accepted')

    const state = await t.run(async (ctx) => ({
      heartbeats: await ctx.db.query('processorHeartbeats').collect(),
      camera: await ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    }))

    expect(state.heartbeats).toHaveLength(1)
    expect(state.heartbeats[0]).toMatchObject({
      deviceId: 'PROCESSOR-DEMO-001',
      status: 'processing',
      processorVersion: null,
      fps: 12.5,
      inferenceLatencyMs: 42,
      queueDepth: 0,
    })
    expect(state.camera?.lastProcessedAt).not.toBeNull()
    expect(state.camera?.lastProcessedAt).toBeGreaterThan(
      before?.lastProcessedAt ?? 0,
    )
  })
})

describe('model information ingestion', () => {
  it('registers an unverified model version and never self-verifies classes', async () => {
    const t = await setup()
    const response = await post(t, modelInformationEvent())
    expect(response.status).toBe(201)

    const models = await t.run(async (ctx) =>
      ctx.db.query('modelVersions').collect(),
    )
    expect(models).toHaveLength(1)
    expect(models[0]).toMatchObject({
      key: 'roboflow:campus-object-detector:1',
      provider: 'roboflow',
      name: 'campus-object-detector',
      version: '1',
      modelType: 'custom',
      declaredSupportedClasses: ['person', 'backpack'],
      classesVerified: false,
      verifiedAt: null,
    })
  })
})

describe('camera processing status ingestion', () => {
  it('tracks the active processor session and clears it when paused', async () => {
    const t = await setup()
    const start = await post(t, {
      schema_version: '1.0',
      event_id: 'evt-status-processing-001',
      idempotency_key: 'idem-status-processing-001',
      processor_device_id: TEST_DEVICE_ID,
      occurred_at: new Date().toISOString(),
      event_type: 'camera_processing_status',
      camera_id: 'CAM-001',
      status: 'processing',
      processing_session_id: 'session-test-001',
    })
    expect(start.status).toBe(201)

    let camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )
    expect(camera).toMatchObject({
      processingStatus: 'processing',
      activeProcessorDeviceId: 'PROCESSOR-DEMO-001',
      activeProcessingSessionId: 'session-test-001',
    })

    const pause = await post(t, {
      schema_version: '1.0',
      event_id: 'evt-status-paused-001',
      idempotency_key: 'idem-status-paused-001',
      processor_device_id: TEST_DEVICE_ID,
      occurred_at: new Date().toISOString(),
      event_type: 'camera_processing_status',
      camera_id: 'CAM-001',
      status: 'paused',
    })
    expect(pause.status).toBe(201)

    camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )
    expect(camera).toMatchObject({
      processingStatus: 'paused',
      activeProcessorDeviceId: null,
      activeProcessingSessionId: null,
    })
  })
})

describe('detection ingestion', () => {
  it('stores a detection, its track, and marks the camera processing', async () => {
    const t = await setup()
    const response = await post(t, detectionEvent())
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      detection_id: string
      track_key: string
      incident_created: boolean
    }
    expect(body.incident_created).toBe(false)
    expect(body.track_key).toBe('CAM-001:session-test-001:11')

    const state = await t.run(async (ctx) => ({
      detections: await ctx.db.query('detections').collect(),
      tracks: await ctx.db.query('objectTracks').collect(),
      camera: await ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    }))

    expect(state.detections).toHaveLength(1)
    expect(state.detections[0]).toMatchObject({
      externalEventId: 'evt-detection-001',
      objectClass: 'backpack',
      status: 'stationary',
      source: 'PROCESSOR',
      trackKey: 'CAM-001:session-test-001:11',
      snapshot: {
        cameraName: 'Main Entrance Camera',
        location: 'Main Entrance',
        building: 'Administration Building',
      },
    })
    expect(state.tracks).toHaveLength(1)
    expect(state.tracks[0]).toMatchObject({
      trackKey: 'CAM-001:session-test-001:11',
      state: 'OBSERVED',
      updateCount: 1,
      incidentId: null,
    })
    expect(state.camera?.processingStatus).toBe('processing')
    expect(state.camera?.activeProcessingSessionId).toBe('session-test-001')
  })

  it('never creates an incident for a person-only detection', async () => {
    const t = await setup()
    const response = await post(
      t,
      detectionEvent({
        event_id: 'evt-person-detection-001',
        idempotency_key: 'idem-person-detection-001',
        object_class: 'person',
        tracking_id: 31,
      }),
    )
    expect(response.status).toBe(201)

    const incidents = await t.run(async (ctx) =>
      ctx.db.query('incidents').collect(),
    )
    expect(incidents).toHaveLength(0)
  })
})

describe('track summary ingestion', () => {
  it('updates an existing track with stationary state and duration', async () => {
    const t = await setup()
    expect((await post(t, detectionEvent())).status).toBe(201)

    const response = await post(t, trackSummaryEvent())
    expect(response.status).toBe(201)

    const tracks = await t.run(async (ctx) =>
      ctx.db.query('objectTracks').collect(),
    )
    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toMatchObject({
      trackKey: 'CAM-001:session-test-001:11',
      state: 'MONITORING',
      stationaryDurationSeconds: 140,
      updateCount: 2,
    })
    expect(tracks[0].currentPosition).toMatchObject({ x: 0.21, y: 0.31 })
  })
})

describe('person association ingestion', () => {
  it('records observations against an existing object track', async () => {
    const t = await setup()
    expect((await post(t, detectionEvent())).status).toBe(201)

    const response = await post(t, personAssociationEvent())
    expect(response.status).toBe(201)

    const state = await t.run(async (ctx) => ({
      associations: await ctx.db.query('personAssociations').collect(),
      track: await ctx.db
        .query('objectTracks')
        .withIndex('by_trackKey', (query) =>
          query.eq('trackKey', 'CAM-001:session-test-001:11'),
        )
        .unique(),
    }))

    expect(state.associations).toHaveLength(1)
    expect(state.associations[0]).toMatchObject({
      trackKey: 'CAM-001:session-test-001:11',
      associatedPersonObserved: false,
      observationWindowSeconds: 90,
      associationConfidence: 0.35,
      nearestPersonTrackingId: null,
    })
    expect(state.associations[0].observations).toHaveLength(1)
    expect(state.track?.lastPersonAssociationId).toBe(
      state.associations[0]._id,
    )
  })

  it('rejects an association for a track that was never recorded', async () => {
    const t = await setup()
    const response = await post(t, personAssociationEvent())
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'TRACK_NOT_FOUND' },
    })
  })
})

describe('potential unattended object ingestion', () => {
  it('creates an incident, evidence metadata, and a timeline for human review', async () => {
    const t = await setup()
    const response = await post(t, potentialIncidentEvent())
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      incident_id: string
      incident_number: string
      incident_created: boolean
    }
    expect(body.incident_created).toBe(true)
    expect(body.incident_number).toMatch(/^INC-\d{4}-0001$/)

    const state = await t.run(async (ctx) => ({
      incidents: await ctx.db.query('incidents').collect(),
      evidence: await ctx.db.query('incidentEvidence').collect(),
      actions: await ctx.db.query('incidentActions').collect(),
      tracks: await ctx.db.query('objectTracks').collect(),
      models: await ctx.db.query('modelVersions').collect(),
    }))

    expect(state.incidents).toHaveLength(1)
    expect(state.incidents[0]).toMatchObject({
      incidentNumber: body.incident_number,
      objectType: 'backpack',
      status: 'new',
      priority: 'high',
      source: 'PROCESSOR',
      trackKey: 'CAM-001:session-test-001:11',
      assignedUserId: null,
    })
    expect(state.incidents[0].evidenceSnapshot).toMatchObject({
      objectClass: 'backpack',
      cameraExternalId: 'CAM-001',
      detectionStatus: 'potential_incident',
    })
    expect(state.evidence).toHaveLength(1)
    expect(state.evidence[0]).toMatchObject({
      kind: 'detection_metadata',
      storageProvider: 'none',
      storageRef: null,
    })
    expect(state.actions.map((action) => action.type)).toEqual([
      'detected',
      'created',
    ])
    expect(state.tracks[0]).toMatchObject({
      state: 'ALERTED',
      incidentId: state.incidents[0]._id,
    })
    expect(state.models).toHaveLength(1)
    expect(state.models[0].classesVerified).toBe(false)
  })

  it('suppresses repeated alerts for the same active track', async () => {
    const t = await setup()
    expect((await post(t, potentialIncidentEvent())).status).toBe(201)

    const repeat = await post(
      t,
      potentialIncidentEvent({
        event_id: 'evt-potential-repeat-001',
        idempotency_key: 'idem-potential-repeat-001',
      }),
    )
    expect(repeat.status).toBe(201)
    const body = (await repeat.json()) as {
      incident_created: boolean
      incident_id: string
    }
    expect(body.incident_created).toBe(false)

    const state = await t.run(async (ctx) => ({
      incidents: await ctx.db.query('incidents').collect(),
      logs: await ctx.db.query('activityLogs').collect(),
    }))
    expect(state.incidents).toHaveLength(1)
    expect(
      state.logs.filter((log) => log.type === 'duplicate_alert_suppressed'),
    ).toHaveLength(1)
  })

  it('maps high-confidence demo alerts to critical priority', async () => {
    const t = await setup()
    const response = await post(
      t,
      potentialIncidentEvent({ confidence: 0.96 }),
    )
    expect(response.status).toBe(201)

    const incidents = await t.run(async (ctx) =>
      ctx.db.query('incidents').collect(),
    )
    expect(incidents[0].priority).toBe('critical')
  })

  it('creates human-review incidents for expanded portable-object classes', async () => {
    const t = await setup()
    const response = await post(
      t,
      potentialIncidentEvent({
        event_id: 'evt-potential-parcel-001',
        idempotency_key: 'idem-potential-parcel-001',
        tracking_id: 88,
        object_class: 'parcel',
      }),
    )
    expect(response.status).toBe(201)

    const incidents = await t.run(async (ctx) =>
      ctx.db.query('incidents').collect(),
    )
    expect(incidents).toHaveLength(1)
    expect(incidents[0]).toMatchObject({
      objectType: 'parcel',
      status: 'new',
      description:
        'Potential unattended parcel reported on Main Entrance Camera. Human verification is required.',
    })
  })

  it('links metadata-only alerts to the latest detection on the track', async () => {
    const t = await setup()
    expect((await post(t, detectionEvent())).status).toBe(201)

    const response = await post(
      t,
      potentialIncidentEvent({
        event_id: 'evt-potential-without-box-001',
        idempotency_key: 'idem-potential-without-box-001',
        bounding_box: undefined,
      }),
    )
    expect(response.status).toBe(201)

    const state = await t.run(async (ctx) => ({
      detection: await ctx.db.query('detections').first(),
      incident: await ctx.db.query('incidents').first(),
      evidence: await ctx.db.query('incidentEvidence').first(),
    }))
    expect(state.detection).not.toBeNull()
    expect(state.incident?.detectionId).toBe(state.detection?._id)
    expect(state.incident?.evidenceSnapshot.detectionId).toBe(
      state.detection?._id,
    )
    expect(state.evidence?.metadata.detectionId).toBe(state.detection?._id)
    expect(state.incident?.evidenceSnapshot.boundingBox).toEqual(
      state.detection?.boundingBox,
    )
  })

  it('rejects a potential incident that references a mismatched track class', async () => {
    const t = await setup()
    expect((await post(t, detectionEvent())).status).toBe(201)

    const response = await post(
      t,
      potentialIncidentEvent({
        event_id: 'evt-potential-mismatch-001',
        idempotency_key: 'idem-potential-mismatch-001',
        object_class: 'suitcase',
      }),
    )
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'TRACK_CLASS_MISMATCH' },
    })
  })
})
