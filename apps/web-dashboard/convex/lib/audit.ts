import type { Infer } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { activityLogType, incidentActionType } from '../validators'

export type ActivityLogType = Infer<typeof activityLogType>
export type IncidentActionType = Infer<typeof incidentActionType>

export async function recordActivity(
  ctx: MutationCtx,
  entry: {
    type: ActivityLogType
    actor?: Doc<'users'> | null
    actorName?: string
    targetType: string
    targetId: string
    description: string
    createdAt: number
  },
): Promise<Id<'activityLogs'>> {
  return await ctx.db.insert('activityLogs', {
    type: entry.type,
    actorUserId: entry.actor?._id ?? null,
    actorName: entry.actor?.fullName ?? entry.actorName ?? 'System',
    targetType: entry.targetType,
    targetId: entry.targetId,
    description: entry.description,
    createdAt: entry.createdAt,
  })
}

export async function recordIncidentAction(
  ctx: MutationCtx,
  entry: {
    incidentId: Id<'incidents'>
    type: IncidentActionType
    actor?: Doc<'users'> | null
    description: string
    noteContent?: string | null
    createdAt: number
  },
): Promise<Id<'incidentActions'>> {
  return await ctx.db.insert('incidentActions', {
    incidentId: entry.incidentId,
    type: entry.type,
    actorUserId: entry.actor?._id ?? null,
    actorName: entry.actor?.fullName ?? 'System',
    actorRole: entry.actor?.role ?? null,
    description: entry.description,
    noteContent: entry.noteContent ?? null,
    createdAt: entry.createdAt,
  })
}
