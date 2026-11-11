import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { appError, getCurrentUser } from './lib/auth'
import { requirePermission } from './lib/permissions'
import { detectionStatus } from './validators'

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 50
  }
  return Math.min(Math.max(Math.trunc(value), 1), 200)
}

async function officerTrackKeys(
  ctx: QueryCtx,
  userId: Doc<'users'>['_id'],
): Promise<ReadonlySet<string>> {
  const incidents = await ctx.db
    .query('incidents')
    .withIndex('by_assignedUserId', (query) =>
      query.eq('assignedUserId', userId),
    )
    .collect()

  return new Set(incidents.map((incident) => incident.trackKey))
}

export const list = query({
  args: {
    cameraId: v.optional(v.id('cameras')),
    status: v.optional(detectionStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'detections:view')

    const limit = clampLimit(args.limit)
    const scanLimit = 500

    let detections: Doc<'detections'>[]
    if (args.cameraId) {
      detections = await ctx.db
        .query('detections')
        .withIndex('by_cameraId_occurredAt', (query) =>
          query.eq('cameraId', args.cameraId as Doc<'cameras'>['_id']),
        )
        .order('desc')
        .take(scanLimit)
    } else if (args.status) {
      detections = await ctx.db
        .query('detections')
        .withIndex('by_status', (query) =>
          query.eq('status', args.status as NonNullable<typeof args.status>),
        )
        .order('desc')
        .take(scanLimit)
    } else {
      detections = await ctx.db
        .query('detections')
        .order('desc')
        .take(scanLimit)
    }

    let filtered = detections
    if (args.cameraId && args.status) {
      filtered = filtered.filter(
        (detection) => detection.status === args.status,
      )
    }

    if (actor.role === 'Security Officer') {
      const trackKeys = await officerTrackKeys(ctx, actor._id)
      filtered = filtered.filter((detection) =>
        trackKeys.has(detection.trackKey),
      )
    }

    return filtered
      .sort((first, second) => second.occurredAt - first.occurredAt)
      .slice(0, limit)
  },
})

export const get = query({
  args: { detectionId: v.id('detections') },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'detections:view')

    const detection = await ctx.db.get(args.detectionId)
    if (!detection) {
      throw appError('DETECTION_NOT_FOUND', 'The detection was not found.')
    }

    if (actor.role === 'Security Officer') {
      const trackKeys = await officerTrackKeys(ctx, actor._id)
      if (!trackKeys.has(detection.trackKey)) {
        throw appError(
          'FORBIDDEN',
          'Security officers can view only detections linked to their assigned incidents.',
        )
      }
    }

    return detection
  },
})
