import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'
import {
  TEST_EVENT_PATH,
  TEST_PROCESSOR_SECRET,
  detectionEvent,
  heartbeatEvent,
  modelInformationEvent,
  signEventRequest,
} from './testSupport'

const modules = import.meta.glob('./**/*.ts')

type TestConvex = Awaited<ReturnType<typeof setup>>

async function setup() {
  const t = convexTest(schema, modules)
  await t.mutation(internal.development.seedReferenceData, {})
  return t
}

const administrator = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:administrator' })
const supervisor = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:supervisor' })
const officer = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:officer' })

async function post(t: TestConvex, body: Record<string, unknown>) {
  const signed = await signEventRequest({ body })
  const response = await t.fetch(TEST_EVENT_PATH, {
    method: 'POST',
    headers: signed.headers,
    body: signed.bodyText,
  })
  expect(response.status).toBe(201)
  return (await response.json()) as Record<string, unknown>
}

beforeAll(() => {
  process.env.PROCESSOR_SHARED_SECRET = TEST_PROCESSOR_SECRET
  delete process.env.PROCESSOR_DEVICE_ID
  delete process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS
  delete process.env.PROCESSOR_MAX_REQUEST_BYTES
})

describe('user administration', () => {
  it('restricts user management to administrators', async () => {
    const t = await setup()

    const users = await administrator(t).query(api.users.list, {})
    expect(users).toHaveLength(4)
    expect(users.map((user) => user.role).sort()).toEqual([
      'Administrator',
      'Security Officer',
      'Security Officer',
      'Supervisor',
    ])
    expect(users[0]).not.toHaveProperty('tokenIdentifier')

    await expect(supervisor(t).query(api.users.list, {})).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    })
  })

  it('lists only active officers and supervisors for assignment', async () => {
    const t = await setup()

    const assignable = await supervisor(t).query(
      api.users.listAssignableOfficers,
      {},
    )
    expect(assignable.map((user) => user.role)).toEqual([
      'Security Officer',
      'Security Officer',
      'Supervisor',
    ])

    await expect(
      officer(t).query(api.users.listAssignableOfficers, {}),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })

  it('changes a role and records the change in the activity log', async () => {
    const t = await setup()
    const target = await t.run(async (ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (query) =>
          query.eq('tokenIdentifier', 'demo:officer-2'),
        )
        .unique(),
    )
    expect(target).not.toBeNull()

    const updated = await administrator(t).mutation(api.users.updateRole, {
      userId: target!._id,
      role: 'Supervisor',
    })
    expect(updated.role).toBe('Supervisor')

    const logs = await administrator(t).query(api.activityLogs.list, {})
    expect(logs.some((log) => log.type === 'user_role_changed')).toBe(true)
  })

  it('prevents administrators from demoting or deactivating themselves', async () => {
    const t = await setup()
    const admin = await t.run(async (ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (query) =>
          query.eq('tokenIdentifier', 'demo:administrator'),
        )
        .unique(),
    )
    expect(admin).not.toBeNull()

    await expect(
      administrator(t).mutation(api.users.updateRole, {
        userId: admin!._id,
        role: 'Supervisor',
      }),
    ).rejects.toMatchObject({ data: { code: 'CANNOT_DEMOTE_SELF' } })

    await expect(
      administrator(t).mutation(api.users.setStatus, {
        userId: admin!._id,
        status: 'Inactive',
      }),
    ).rejects.toMatchObject({ data: { code: 'CANNOT_DEACTIVATE_SELF' } })
  })
})

describe('camera and zone administration', () => {
  it('creates, updates, and deletes a camera without history', async () => {
    const t = await setup()

    const created = await administrator(t).mutation(api.cameras.create, {
      name: 'Test Camera',
      location: 'Test Hall',
      building: 'Test Building',
      floor: 'First Floor',
      cameraType: 'Dome Camera',
      ipAddress: '192.168.1.150',
      resolution: '1920x1080',
      description: 'Created by an automated test.',
    })
    expect(created).toMatchObject({
      externalId: 'CAM-006',
      status: 'Offline',
      monitoringEnabled: false,
      source: 'LIVE',
    })

    const updated = await administrator(t).mutation(api.cameras.update, {
      cameraId: created!._id,
      name: 'Updated Test Camera',
      location: 'Test Hall',
      building: 'Test Building',
      floor: 'Second Floor',
      cameraType: 'Dome Camera',
      ipAddress: '192.168.1.151',
      resolution: '1280x720',
      description: 'Updated by an automated test.',
      status: 'Maintenance',
    })
    expect(updated).toMatchObject({
      name: 'Updated Test Camera',
      status: 'Maintenance',
      floor: 'Second Floor',
    })

    const removed = await administrator(t).mutation(api.cameras.remove, {
      cameraId: created!._id,
    })
    expect(removed).toEqual({ deleted: true, externalId: 'CAM-006' })
  })

  it('prevents supervisors from managing cameras', async () => {
    const t = await setup()
    await expect(
      supervisor(t).mutation(api.cameras.create, {
        name: 'Forbidden Camera',
        location: 'Nowhere',
        building: 'Nowhere',
        floor: 'Ground Floor',
        cameraType: 'Dome Camera',
        ipAddress: '192.168.1.160',
        resolution: '1920x1080',
        description: 'Should never be created.',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })

  it('refuses to delete a camera that has detection history', async () => {
    const t = await setup()
    await post(t, detectionEvent())

    const camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )
    expect(camera).not.toBeNull()

    await expect(
      administrator(t).mutation(api.cameras.remove, {
        cameraId: camera!._id,
      }),
    ).rejects.toMatchObject({ data: { code: 'CAMERA_IN_USE' } })
  })

  it('refuses to delete a camera that has processor heartbeat history', async () => {
    const t = await setup()
    await post(t, heartbeatEvent())

    const camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )

    await expect(
      administrator(t).mutation(api.cameras.remove, {
        cameraId: camera!._id,
      }),
    ).rejects.toMatchObject({ data: { code: 'CAMERA_IN_USE' } })
  })

  it('creates and updates a demo monitoring zone', async () => {
    const t = await setup()
    const camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )

    const created = await administrator(t).mutation(api.cameras.createZone, {
      cameraId: camera!._id,
      name: 'Test Zone',
      description: 'Automated test zone.',
      polygon: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
      enabled: true,
      demo: true,
    })
    expect(created).toMatchObject({
      externalId: 'ZONE-006',
      demo: true,
      enabled: true,
    })

    const updated = await administrator(t).mutation(api.cameras.updateZone, {
      zoneId: created!._id,
      enabled: false,
      name: 'Updated Test Zone',
    })
    expect(updated).toMatchObject({
      name: 'Updated Test Zone',
      enabled: false,
    })

    const logs = await administrator(t).query(api.activityLogs.list, {})
    expect(
      logs.some((log) => log.type === 'monitoring_zone_updated'),
    ).toBe(true)
  })

  it('rejects invalid monitoring zone polygons', async () => {
    const t = await setup()
    const camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )

    await expect(
      administrator(t).mutation(api.cameras.createZone, {
        cameraId: camera!._id,
        name: 'Invalid Zone',
        description: 'Too few points.',
        polygon: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.8 },
        ],
        enabled: true,
        demo: true,
      }),
    ).rejects.toMatchObject({ data: { code: 'INVALID_POLYGON' } })
  })
})

describe('processor administration', () => {
  it('registers a processor and revokes it with camera cleanup', async () => {
    const t = await setup()
    await post(t, detectionEvent())

    const registered = await administrator(t).mutation(api.processors.register, {
      deviceId: 'PROCESSOR-TEST-002',
      name: 'Test processor',
      description: 'Automated test registration.',
    })
    expect(registered).toMatchObject({
      deviceId: 'PROCESSOR-TEST-002',
      status: 'active',
    })

    const listed = await administrator(t).query(api.processors.list, {})
    expect(listed.map((processor) => processor.deviceId)).toEqual([
      'PROCESSOR-DEMO-001',
      'PROCESSOR-TEST-002',
    ])

    const demoProcessor = listed.find(
      (processor) => processor.deviceId === 'PROCESSOR-DEMO-001',
    )
    const revoked = await administrator(t).mutation(api.processors.setStatus, {
      processorId: demoProcessor!._id,
      status: 'revoked',
    })
    expect(revoked).not.toBeNull()
    expect(revoked!.status).toBe('revoked')

    const camera = await t.run(async (ctx) =>
      ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', 'CAM-001'),
        )
        .unique(),
    )
    expect(camera).toMatchObject({
      processingStatus: 'idle',
      activeProcessorDeviceId: null,
      activeProcessingSessionId: null,
    })
  })

  it('restricts processor administration to administrators', async () => {
    const t = await setup()
    await expect(
      supervisor(t).mutation(api.processors.register, {
        deviceId: 'PROCESSOR-FORBIDDEN-001',
        name: 'Forbidden processor',
        description: 'Should never be registered.',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })
})

describe('model administration', () => {
  it('marks a processor-reported model as verified only after explicit inspection', async () => {
    const t = await setup()
    await post(t, modelInformationEvent())

    const models = await administrator(t).query(api.models.list, {})
    expect(models).toHaveLength(1)
    expect(models[0].classesVerified).toBe(false)

    const verified = await administrator(t).mutation(api.models.markVerified, {
      modelVersionId: models[0]._id,
      supportedClasses: ['person', 'backpack'],
      notes: 'Manually inspected the model card.',
    })
    expect(verified).toMatchObject({
      classesVerified: true,
      declaredSupportedClasses: ['person', 'backpack'],
      verificationNotes: 'Manually inspected the model card.',
    })

    await post(
      t,
      modelInformationEvent({
        event_id: 'evt-model-after-verification-001',
        idempotency_key: 'idem-model-after-verification-001',
        model: {
          provider: 'roboflow',
          name: 'campus-object-detector',
          version: '1',
          model_type: 'custom',
          supported_classes: ['suitcase'],
        },
      }),
    )

    const afterProcessorReport = await administrator(t).query(
      api.models.list,
      {},
    )
    expect(afterProcessorReport[0]).toMatchObject({
      classesVerified: true,
      declaredSupportedClasses: ['person', 'backpack'],
      verificationNotes: 'Manually inspected the model card.',
    })
  })

  it('prevents supervisors from verifying model classes', async () => {
    const t = await setup()
    await post(t, modelInformationEvent())
    const models = await administrator(t).query(api.models.list, {})

    await expect(
      supervisor(t).mutation(api.models.markVerified, {
        modelVersionId: models[0]._id,
        supportedClasses: ['person'],
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })
})

describe('activity logs and monitoring overview', () => {
  it('shows activity logs only to administrators', async () => {
    const t = await setup()
    await administrator(t).mutation(api.processors.register, {
      deviceId: 'PROCESSOR-LOG-001',
      name: 'Log test processor',
      description: 'Generates an activity log entry.',
    })

    const logs = await administrator(t).query(api.activityLogs.list, {
      limit: 10,
    })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toHaveProperty('description')

    await expect(
      officer(t).query(api.activityLogs.list, {}),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })

  it('exposes a read-only monitoring overview to monitoring users', async () => {
    const t = await setup()
    const overview = await officer(t).query(api.monitoring.overview, {})

    expect(overview.cameras).toHaveLength(5)
    expect(overview.zones).toHaveLength(5)
    expect(overview.processors).toHaveLength(1)
    expect(overview.incidentCounts).toEqual({
      new: 0,
      acknowledged: 0,
      investigating: 0,
      resolved: 0,
      false_alarm: 0,
    })
  })
})
