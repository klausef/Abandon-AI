import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { recordActivity } from './lib/audit'
import { appError, getCurrentUser, type AppUser } from './lib/auth'
import { nextCounterValue } from './lib/counters'
import { requirePermission } from './lib/permissions'
import {
  cameraStatus,
  cameraType,
  normalizedPoint,
} from './validators'

function requireText(
  value: string,
  field: string,
  maxLength: number,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw appError('INVALID_INPUT', `${field} is required.`)
  }
  if (trimmed.length > maxLength) {
    throw appError(
      'INVALID_INPUT',
      `${field} must be at most ${maxLength} characters.`,
    )
  }
  return trimmed
}

async function requireCameraAdministrator(
  ctx: MutationCtx,
): Promise<AppUser> {
  const actor = await getCurrentUser(ctx)
  requirePermission(actor, 'cameras:manage')
  return actor
}

async function nextExternalId(
  ctx: MutationCtx,
  counterName: string,
  existingIds: readonly string[],
  prefix: string,
  padding: number,
): Promise<string> {
  const highestSuffix = existingIds.reduce((highest, externalId) => {
    const match = externalId.match(/(\d+)$/)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0)

  const counter = await nextCounterValue(ctx, counterName)
  const sequence = Math.max(highestSuffix, counter)
  return `${prefix}${String(sequence).padStart(padding, '0')}`
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'cameras:view')

    const cameras = await ctx.db.query('cameras').collect()
    return cameras.sort((first, second) =>
      first.externalId.localeCompare(second.externalId),
    )
  },
})

export const get = query({
  args: { cameraId: v.id('cameras') },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'cameras:view')
    return await ctx.db.get(args.cameraId)
  },
})

export const listZones = query({
  args: { cameraId: v.optional(v.id('cameras')) },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'cameras:view')

    const zones = args.cameraId
      ? await ctx.db
          .query('monitoringZones')
          .withIndex('by_cameraId', (query) =>
            query.eq('cameraId', args.cameraId as Doc<'cameras'>['_id']),
          )
          .collect()
      : await ctx.db.query('monitoringZones').collect()

    return zones.sort((first, second) =>
      first.externalId.localeCompare(second.externalId),
    )
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    building: v.string(),
    floor: v.string(),
    cameraType,
    ipAddress: v.string(),
    resolution: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireCameraAdministrator(ctx)
    const now = Date.now()

    const cameras = await ctx.db.query('cameras').collect()
    const externalId = await nextExternalId(
      ctx,
      'camera',
      cameras.map((camera) => camera.externalId),
      'CAM-',
      3,
    )

    const cameraId = await ctx.db.insert('cameras', {
      externalId,
      name: requireText(args.name, 'Camera name', 120),
      location: requireText(args.location, 'Location', 120),
      building: requireText(args.building, 'Building', 120),
      floor: requireText(args.floor, 'Floor', 60),
      cameraType: args.cameraType,
      ipAddress: requireText(args.ipAddress, 'IP address', 64),
      status: 'Offline',
      monitoringEnabled: false,
      resolution: requireText(args.resolution, 'Resolution', 40),
      installedDate: new Date(now).toISOString().slice(0, 10),
      lastConnectionAt: now,
      description: requireText(args.description, 'Description', 500),
      processingStatus: 'idle',
      activeProcessorDeviceId: null,
      activeProcessingSessionId: null,
      lastProcessedAt: null,
      source: 'LIVE',
      createdAt: now,
      updatedAt: now,
    })

    await recordActivity(ctx, {
      type: 'camera_created',
      actor,
      targetType: 'camera',
      targetId: externalId,
      description: `Camera ${externalId} created.`,
      createdAt: now,
    })

    return await ctx.db.get(cameraId)
  },
})

export const update = mutation({
  args: {
    cameraId: v.id('cameras'),
    name: v.string(),
    location: v.string(),
    building: v.string(),
    floor: v.string(),
    cameraType,
    ipAddress: v.string(),
    resolution: v.string(),
    description: v.string(),
    status: cameraStatus,
  },
  handler: async (ctx, args) => {
    const actor = await requireCameraAdministrator(ctx)
    const camera = await ctx.db.get(args.cameraId)
    if (!camera) {
      throw appError('CAMERA_NOT_FOUND', 'The camera was not found.')
    }

    const now = Date.now()
    await ctx.db.patch(camera._id, {
      name: requireText(args.name, 'Camera name', 120),
      location: requireText(args.location, 'Location', 120),
      building: requireText(args.building, 'Building', 120),
      floor: requireText(args.floor, 'Floor', 60),
      cameraType: args.cameraType,
      ipAddress: requireText(args.ipAddress, 'IP address', 64),
      resolution: requireText(args.resolution, 'Resolution', 40),
      description: requireText(args.description, 'Description', 500),
      status: args.status,
      updatedAt: now,
    })

    await recordActivity(ctx, {
      type: 'camera_updated',
      actor,
      targetType: 'camera',
      targetId: camera.externalId,
      description: `Camera ${camera.externalId} updated.`,
      createdAt: now,
    })

    return await ctx.db.get(camera._id)
  },
})

export const setMonitoringEnabled = mutation({
  args: {
    cameraId: v.id('cameras'),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireCameraAdministrator(ctx)
    const camera = await ctx.db.get(args.cameraId)
    if (!camera) {
      throw appError('CAMERA_NOT_FOUND', 'The camera was not found.')
    }

    const now = Date.now()
    await ctx.db.patch(camera._id, {
      monitoringEnabled: args.enabled,
      processingStatus: args.enabled ? camera.processingStatus : 'idle',
      activeProcessorDeviceId: args.enabled
        ? camera.activeProcessorDeviceId
        : null,
      activeProcessingSessionId: args.enabled
        ? camera.activeProcessingSessionId
        : null,
      updatedAt: now,
    })

    await recordActivity(ctx, {
      type: 'camera_updated',
      actor,
      targetType: 'camera',
      targetId: camera.externalId,
      description: `Camera ${camera.externalId} monitoring ${
        args.enabled ? 'enabled' : 'disabled'
      }.`,
      createdAt: now,
    })

    return await ctx.db.get(camera._id)
  },
})

export const remove = mutation({
  args: { cameraId: v.id('cameras') },
  handler: async (ctx, args) => {
    const actor = await requireCameraAdministrator(ctx)
    const camera = await ctx.db.get(args.cameraId)
    if (!camera) {
      throw appError('CAMERA_NOT_FOUND', 'The camera was not found.')
    }

    const incident = await ctx.db
      .query('incidents')
      .withIndex('by_cameraId_createdAt', (query) =>
        query.eq('cameraId', camera._id),
      )
      .first()
    if (incident) {
      throw appError(
        'CAMERA_IN_USE',
        'Cameras with incident history cannot be deleted.',
      )
    }

    const detection = await ctx.db
      .query('detections')
      .withIndex('by_cameraId_occurredAt', (query) =>
        query.eq('cameraId', camera._id),
      )
      .first()
    if (detection) {
      throw appError(
        'CAMERA_IN_USE',
        'Cameras with detection history cannot be deleted.',
      )
    }

    const track = await ctx.db
      .query('objectTracks')
      .withIndex('by_cameraId_lastSeenAt', (query) =>
        query.eq('cameraId', camera._id),
      )
      .first()
    if (track) {
      throw appError(
        'CAMERA_IN_USE',
        'Cameras with object tracking history cannot be deleted.',
      )
    }

    const heartbeat = await ctx.db
      .query('processorHeartbeats')
      .withIndex('by_cameraId_reportedAt', (query) =>
        query.eq('cameraId', camera._id),
      )
      .first()
    if (heartbeat) {
      throw appError(
        'CAMERA_IN_USE',
        'Cameras with processor heartbeat history cannot be deleted.',
      )
    }

    const zones = await ctx.db
      .query('monitoringZones')
      .withIndex('by_cameraId', (query) =>
        query.eq('cameraId', camera._id),
      )
      .collect()
    for (const zone of zones) {
      await ctx.db.delete(zone._id)
    }

    await ctx.db.delete(camera._id)

    await recordActivity(ctx, {
      type: 'camera_deleted',
      actor,
      targetType: 'camera',
      targetId: camera.externalId,
      description: `Camera ${camera.externalId} and ${zones.length} monitoring zone(s) deleted.`,
      createdAt: Date.now(),
    })

    return { deleted: true, externalId: camera.externalId }
  },
})

function validatePolygon(
  polygon: readonly { x: number; y: number }[],
): void {
  if (polygon.length < 3 || polygon.length > 64) {
    throw appError(
      'INVALID_POLYGON',
      'A monitoring zone polygon must have between 3 and 64 points.',
    )
  }
  for (const point of polygon) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.x > 1 ||
      point.y < 0 ||
      point.y > 1
    ) {
      throw appError(
        'INVALID_POLYGON',
        'Monitoring zone points must be normalized between 0 and 1.',
      )
    }
  }
}

export const createZone = mutation({
  args: {
    cameraId: v.id('cameras'),
    name: v.string(),
    description: v.string(),
    polygon: v.array(normalizedPoint),
    enabled: v.boolean(),
    demo: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireCameraAdministrator(ctx)
    const camera = await ctx.db.get(args.cameraId)
    if (!camera) {
      throw appError('CAMERA_NOT_FOUND', 'The camera was not found.')
    }

    validatePolygon(args.polygon)
    const now = Date.now()
    const zones = await ctx.db.query('monitoringZones').collect()
    const externalId = await nextExternalId(
      ctx,
      'zone',
      zones.map((zone) => zone.externalId),
      'ZONE-',
      3,
    )

    const zoneId = await ctx.db.insert('monitoringZones', {
      externalId,
      cameraId: camera._id,
      name: requireText(args.name, 'Zone name', 120),
      description: requireText(args.description, 'Description', 500),
      polygon: args.polygon.map((point) => ({ x: point.x, y: point.y })),
      enabled: args.enabled,
      demo: args.demo,
      createdAt: now,
      updatedAt: now,
    })

    await recordActivity(ctx, {
      type: 'monitoring_zone_created',
      actor,
      targetType: 'monitoringZone',
      targetId: externalId,
      description: `Monitoring zone ${externalId} created for camera ${camera.externalId}.`,
      createdAt: now,
    })

    return await ctx.db.get(zoneId)
  },
})

export const updateZone = mutation({
  args: {
    zoneId: v.id('monitoringZones'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    polygon: v.optional(v.array(normalizedPoint)),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireCameraAdministrator(ctx)
    const zone = await ctx.db.get(args.zoneId)
    if (!zone) {
      throw appError('ZONE_NOT_FOUND', 'The monitoring zone was not found.')
    }

    if (args.polygon) {
      validatePolygon(args.polygon)
    }

    const now = Date.now()
    const patch: Partial<Doc<'monitoringZones'>> = { updatedAt: now }
    if (args.name !== undefined) {
      patch.name = requireText(args.name, 'Zone name', 120)
    }
    if (args.description !== undefined) {
      patch.description = requireText(args.description, 'Description', 500)
    }
    if (args.polygon !== undefined) {
      patch.polygon = args.polygon.map((point) => ({
        x: point.x,
        y: point.y,
      }))
    }
    if (args.enabled !== undefined) {
      patch.enabled = args.enabled
    }

    await ctx.db.patch(zone._id, patch)

    await recordActivity(ctx, {
      type: 'monitoring_zone_updated',
      actor,
      targetType: 'monitoringZone',
      targetId: zone.externalId,
      description: `Monitoring zone ${zone.externalId} updated.`,
      createdAt: now,
    })

    return await ctx.db.get(zone._id)
  },
})
