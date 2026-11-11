import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { recordActivity } from './lib/audit'
import { appError, getCurrentUser } from './lib/auth'
import { requirePermission } from './lib/permissions'
import { processorStatus } from './validators'

const DEVICE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

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

function clampLimit(value: number | undefined, maximum: number): number {
  if (value === undefined) {
    return 20
  }
  if (!Number.isFinite(value)) {
    return 20
  }
  return Math.min(Math.max(Math.trunc(value), 1), maximum)
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'settings:view')

    const processors = await ctx.db.query('processorDevices').collect()
    return processors.sort((first, second) =>
      first.deviceId.localeCompare(second.deviceId),
    )
  },
})

export const register = mutation({
  args: {
    deviceId: v.string(),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'settings:view')

    const deviceId = args.deviceId.trim()
    if (!DEVICE_PATTERN.test(deviceId)) {
      throw appError(
        'INVALID_DEVICE_ID',
        'Device IDs must be 1 to 128 characters and contain only letters, numbers, dot, underscore, colon, or hyphen.',
      )
    }

    const name = requireText(args.name, 'Processor name', 120)
    const description = requireText(args.description, 'Description', 500)
    const now = Date.now()

    const existing = await ctx.db
      .query('processorDevices')
      .withIndex('by_deviceId', (query) => query.eq('deviceId', deviceId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        description,
        status: 'active',
        updatedAt: now,
      })

      await recordActivity(ctx, {
        type: 'processor_registered',
        actor,
        targetType: 'processorDevice',
        targetId: deviceId,
        description: `Processor ${deviceId} re-registered and set active.`,
        createdAt: now,
      })

      return await ctx.db.get(existing._id)
    }

    const processorId = await ctx.db.insert('processorDevices', {
      deviceId,
      name,
      status: 'active',
      description,
      lastSeenAt: null,
      registeredAt: now,
      updatedAt: now,
    })

    await recordActivity(ctx, {
      type: 'processor_registered',
      actor,
      targetType: 'processorDevice',
      targetId: deviceId,
      description: `Processor ${deviceId} registered.`,
      createdAt: now,
    })

    return await ctx.db.get(processorId)
  },
})

export const setStatus = mutation({
  args: {
    processorId: v.id('processorDevices'),
    status: processorStatus,
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'settings:view')

    const processor = await ctx.db.get(args.processorId)
    if (!processor) {
      throw appError(
        'PROCESSOR_NOT_FOUND',
        'The processor device was not found.',
      )
    }

    const now = Date.now()
    await ctx.db.patch(processor._id, {
      status: args.status,
      updatedAt: now,
    })

    if (args.status === 'revoked') {
      const cameras = await ctx.db
        .query('cameras')
        .withIndex('by_activeProcessorDeviceId', (query) =>
          query.eq('activeProcessorDeviceId', processor.deviceId),
        )
        .collect()

      for (const camera of cameras) {
        await ctx.db.patch(camera._id, {
          processingStatus: 'idle',
          activeProcessorDeviceId: null,
          activeProcessingSessionId: null,
          updatedAt: now,
        })
      }
    }

    await recordActivity(ctx, {
      type:
        args.status === 'revoked'
          ? 'processor_revoked'
          : 'processor_registered',
      actor,
      targetType: 'processorDevice',
      targetId: processor.deviceId,
      description: `Processor ${processor.deviceId} set to ${args.status}.`,
      createdAt: now,
    })

    return await ctx.db.get(processor._id)
  },
})

export const listHeartbeats = query({
  args: {
    deviceId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'cameras:view')

    const limit = clampLimit(args.limit, 100)

    if (args.deviceId) {
      return await ctx.db
        .query('processorHeartbeats')
        .withIndex('by_deviceId_reportedAt', (query) =>
          query.eq('deviceId', args.deviceId as string),
        )
        .order('desc')
        .take(limit)
    }

    return await ctx.db
      .query('processorHeartbeats')
      .withIndex('by_reportedAt')
      .order('desc')
      .take(limit)
  },
})
