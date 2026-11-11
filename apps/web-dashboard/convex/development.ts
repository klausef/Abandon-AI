import type { Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'

type SeedCameraType = 'IP Camera' | 'Dome Camera' | 'Bullet Camera'
type SeedCameraStatus = 'Online' | 'Offline' | 'Maintenance'
type SeedRole = 'Administrator' | 'Security Officer' | 'Supervisor'

interface CameraSeed {
  externalId: string
  name: string
  location: string
  building: string
  floor: string
  cameraType: SeedCameraType
  ipAddress: string
  status: SeedCameraStatus
  monitoringEnabled: boolean
  resolution: string
  installedDate: string
  lastConnectionAt: number
  description: string
  createdAt: number
  updatedAt: number
}

interface UserSeed {
  tokenIdentifier: string
  email: string
  fullName: string
  badgeNumber: string
  role: SeedRole
  officerId: string | null
  createdAt: number
  updatedAt: number
}

/**
 * Reference cameras mirror the five identifiers already used by the dashboard
 * mocks. They are configuration records only; no CCTV connection exists.
 */
const demoCameras: readonly CameraSeed[] = [
  {
    externalId: 'CAM-001',
    name: 'Main Entrance Camera',
    location: 'Main Entrance',
    building: 'Administration Building',
    floor: 'Ground Floor',
    cameraType: 'Bullet Camera',
    ipAddress: '192.168.1.101',
    status: 'Online',
    monitoringEnabled: true,
    resolution: '1920x1080',
    installedDate: '2024-08-15',
    lastConnectionAt: Date.parse('2026-11-09T09:14:32+08:00'),
    description:
      'Covers pedestrian and vehicle access at the main campus entrance.',
    createdAt: Date.parse('2024-08-15T10:00:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:14:32+08:00'),
  },
  {
    externalId: 'CAM-002',
    name: 'Library Lobby Camera',
    location: 'Library Lobby',
    building: 'University Library',
    floor: 'Ground Floor',
    cameraType: 'Dome Camera',
    ipAddress: '192.168.1.102',
    status: 'Online',
    monitoringEnabled: true,
    resolution: '1920x1080',
    installedDate: '2024-09-02',
    lastConnectionAt: Date.parse('2026-11-09T09:14:28+08:00'),
    description:
      'Monitors the library entrance, circulation desk, and lobby waiting area.',
    createdAt: Date.parse('2024-09-02T11:30:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:14:28+08:00'),
  },
  {
    externalId: 'CAM-003',
    name: 'Student Center Camera',
    location: 'Student Center',
    building: 'Student Center',
    floor: 'Ground Floor',
    cameraType: 'IP Camera',
    ipAddress: '192.168.1.103',
    status: 'Online',
    monitoringEnabled: true,
    resolution: '1280x720',
    installedDate: '2024-10-18',
    lastConnectionAt: Date.parse('2026-11-09T09:14:21+08:00'),
    description:
      'Provides a wide view of the student center concourse and seating area.',
    createdAt: Date.parse('2024-10-18T09:15:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:14:21+08:00'),
  },
  {
    externalId: 'CAM-004',
    name: 'Academic Building Camera',
    location: 'Academic Building',
    building: 'Academic Building',
    floor: 'Second Floor',
    cameraType: 'Dome Camera',
    ipAddress: '192.168.1.104',
    status: 'Offline',
    monitoringEnabled: true,
    resolution: '1920x1080',
    installedDate: '2025-01-20',
    lastConnectionAt: Date.parse('2026-11-09T07:36:04+08:00'),
    description:
      'Observes the second-floor corridor near the lecture halls.',
    createdAt: Date.parse('2025-01-20T13:45:00+08:00'),
    updatedAt: Date.parse('2026-11-09T07:36:04+08:00'),
  },
  {
    externalId: 'CAM-005',
    name: 'Campus Waiting Area Camera',
    location: 'Campus Waiting Area',
    building: 'Main Campus',
    floor: 'Ground Floor',
    cameraType: 'Bullet Camera',
    ipAddress: '192.168.1.105',
    status: 'Online',
    monitoringEnabled: true,
    resolution: '1920x1080',
    installedDate: '2025-03-08',
    lastConnectionAt: Date.parse('2026-11-09T09:14:30+08:00'),
    description:
      'Covers the sheltered campus transportation and waiting area.',
    createdAt: Date.parse('2025-03-08T08:20:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:14:30+08:00'),
  },
]

/**
 * Demo identities exist so Convex tests and a future identity provider can be
 * mapped deterministically. They are not credentials and cannot authenticate
 * on their own; `ctx.auth.getUserIdentity()` must supply the token identifier.
 */
const demoUsers: readonly UserSeed[] = [
  {
    tokenIdentifier: 'demo:administrator',
    email: 'maya.chen@example.edu',
    fullName: 'Maya Chen',
    badgeNumber: 'ADM-014',
    role: 'Administrator',
    officerId: null,
    createdAt: Date.parse('2025-01-10T09:00:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:12:00+08:00'),
  },
  {
    tokenIdentifier: 'demo:officer',
    email: 'daniel.reyes@example.edu',
    fullName: 'Daniel Reyes',
    badgeNumber: 'SEC-127',
    role: 'Security Officer',
    officerId: 'SEC-001',
    createdAt: Date.parse('2025-02-14T09:00:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:08:14+08:00'),
  },
  {
    tokenIdentifier: 'demo:officer-2',
    email: 'aisha.morgan@example.edu',
    fullName: 'Aisha Morgan',
    badgeNumber: 'SEC-132',
    role: 'Security Officer',
    officerId: 'SEC-002',
    createdAt: Date.parse('2025-03-21T09:00:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:11:45+08:00'),
  },
  {
    tokenIdentifier: 'demo:supervisor',
    email: 'marcus.lee@example.edu',
    fullName: 'Marcus Lee',
    badgeNumber: 'SUP-021',
    role: 'Supervisor',
    officerId: 'SEC-003',
    createdAt: Date.parse('2025-01-18T09:00:00+08:00'),
    updatedAt: Date.parse('2026-11-09T09:14:02+08:00'),
  },
]

const demoZonePolygon = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
]

/**
 * Idempotent development seed.
 *
 * Creates the five existing camera identifiers, explicitly labeled demo
 * monitoring zones, demo identities, and one inactive demo processor record.
 * It never creates detections, incidents, model evaluations, or footage.
 */
export const seedReferenceData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cameraIds = new Map<string, Id<'cameras'>>()
    let camerasInserted = 0

    for (const seed of demoCameras) {
      const existing = await ctx.db
        .query('cameras')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', seed.externalId),
        )
        .unique()

      if (existing) {
        cameraIds.set(seed.externalId, existing._id)
        continue
      }

      const cameraId = await ctx.db.insert('cameras', {
        ...seed,
        processingStatus: 'idle',
        activeProcessorDeviceId: null,
        activeProcessingSessionId: null,
        lastProcessedAt: null,
        source: 'MOCK',
      })
      cameraIds.set(seed.externalId, cameraId)
      camerasInserted += 1
    }

    let zonesInserted = 0
    for (let index = 0; index < demoCameras.length; index += 1) {
      const cameraSeed = demoCameras[index]
      const cameraId = cameraIds.get(cameraSeed.externalId)
      if (!cameraId) {
        continue
      }

      const externalId = `ZONE-DEMO-${String(index + 1).padStart(3, '0')}`
      const existing = await ctx.db
        .query('monitoringZones')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', externalId),
        )
        .unique()

      if (existing) {
        continue
      }

      await ctx.db.insert('monitoringZones', {
        externalId,
        cameraId,
        name: `${cameraSeed.name} Demo Zone`,
        description:
          'Explicitly labeled demonstration zone. Not a validated campus monitoring zone.',
        polygon: demoZonePolygon.map((point) => ({ ...point })),
        enabled: true,
        demo: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      zonesInserted += 1
    }

    let usersInserted = 0
    for (const seed of demoUsers) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (query) =>
          query.eq('tokenIdentifier', seed.tokenIdentifier),
        )
        .unique()

      if (existing) {
        continue
      }

      await ctx.db.insert('users', {
        ...seed,
        status: 'Active',
        source: 'MOCK',
      })
      usersInserted += 1
    }

    let processorsInserted = 0
    const existingProcessor = await ctx.db
      .query('processorDevices')
      .withIndex('by_deviceId', (query) =>
        query.eq('deviceId', 'PROCESSOR-DEMO-001'),
      )
      .unique()

    if (!existingProcessor) {
      const now = Date.now()
      await ctx.db.insert('processorDevices', {
        deviceId: 'PROCESSOR-DEMO-001',
        name: 'Demo Processor (no device connected)',
        status: 'active',
        description:
          'Registration record for local ingestion testing. No processor is running and no footage is connected.',
        lastSeenAt: null,
        registeredAt: now,
        updatedAt: now,
      })
      processorsInserted = 1
    }

    async function ensureCounter(name: string, value: number) {
      const existing = await ctx.db
        .query('counters')
        .withIndex('by_name', (query) => query.eq('name', name))
        .unique()
      if (!existing) {
        await ctx.db.insert('counters', { name, value })
      }
    }

    await ensureCounter('camera', demoCameras.length)
    await ensureCounter('zone', demoCameras.length)
    await ensureCounter('incident', 0)

    return {
      camerasInserted,
      zonesInserted,
      usersInserted,
      processorsInserted,
    }
  },
})
