import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { recordActivity, recordIncidentAction } from './lib/audit'
import { appError, getCurrentUser, type AppUser } from './lib/auth'
import {
  assertAssignable,
  assertIncidentAccess,
  assertTransition,
} from './lib/incidents'
import { requirePermission } from './lib/permissions'
import { incidentStatus } from './validators'

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 50
  }
  return Math.min(Math.max(Math.trunc(value), 1), 200)
}

async function loadIncident(
  ctx: QueryCtx | MutationCtx,
  incidentId: Id<'incidents'>,
): Promise<Doc<'incidents'>> {
  const incident = await ctx.db.get(incidentId)
  if (!incident) {
    throw appError('INCIDENT_NOT_FOUND', 'The incident was not found.')
  }
  return incident
}

async function requireWorkflowActor(
  ctx: QueryCtx | MutationCtx,
): Promise<AppUser> {
  const actor = await getCurrentUser(ctx)
  requirePermission(actor, 'incidents:operate')
  return actor
}

export const list = query({
  args: {
    status: v.optional(incidentStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'incidents:view')

    const limit = clampLimit(args.limit)

    if (actor.role === 'Security Officer') {
      if (args.status) {
        return await ctx.db
          .query('incidents')
          .withIndex('by_assignedUserId_status', (query) =>
            query
              .eq('assignedUserId', actor._id)
              .eq(
                'status',
                args.status as NonNullable<typeof args.status>,
              ),
          )
          .order('desc')
          .take(limit)
      }

      return await ctx.db
        .query('incidents')
        .withIndex('by_assignedUserId', (query) =>
          query.eq('assignedUserId', actor._id),
        )
        .order('desc')
        .take(limit)
    }

    if (args.status) {
      return await ctx.db
        .query('incidents')
        .withIndex('by_status_createdAt', (query) =>
          query.eq(
            'status',
            args.status as NonNullable<typeof args.status>,
          ),
        )
        .order('desc')
        .take(limit)
    }

    return await ctx.db.query('incidents').order('desc').take(limit)
  },
})

export const get = query({
  args: {
    incidentId: v.optional(v.id('incidents')),
    incidentNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'incidents:view')

    let incident: Doc<'incidents'> | null = null
    if (args.incidentId) {
      incident = await ctx.db.get(args.incidentId)
    } else if (args.incidentNumber) {
      incident = await ctx.db
        .query('incidents')
        .withIndex('by_incidentNumber', (query) =>
          query.eq(
            'incidentNumber',
            args.incidentNumber as string,
          ),
        )
        .unique()
    }

    if (!incident) {
      throw appError('INCIDENT_NOT_FOUND', 'The incident was not found.')
    }

    assertIncidentAccess(actor, incident)
    return incident
  },
})

export const timeline = query({
  args: { incidentId: v.id('incidents') },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'incidents:view')

    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)

    return await ctx.db
      .query('incidentActions')
      .withIndex('by_incidentId_createdAt', (query) =>
        query.eq('incidentId', incident._id),
      )
      .order('asc')
      .take(200)
  },
})

export const evidence = query({
  args: { incidentId: v.id('incidents') },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'incidents:view')

    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)

    return await ctx.db
      .query('incidentEvidence')
      .withIndex('by_incidentId', (query) =>
        query.eq('incidentId', incident._id),
      )
      .collect()
  },
})

export const acknowledge = mutation({
  args: { incidentId: v.id('incidents') },
  handler: async (ctx, args) => {
    const actor = await requireWorkflowActor(ctx)
    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)
    assertTransition(incident, 'acknowledged')

    const now = Date.now()
    await ctx.db.patch(incident._id, {
      status: 'acknowledged',
      acknowledgedAt: now,
      updatedAt: now,
    })

    await recordIncidentAction(ctx, {
      incidentId: incident._id,
      type: 'acknowledged',
      actor,
      description: 'Incident acknowledged for human review.',
      createdAt: now,
    })

    await recordActivity(ctx, {
      type: 'incident_acknowledged',
      actor,
      targetType: 'incident',
      targetId: incident.incidentNumber,
      description: `Incident ${incident.incidentNumber} acknowledged.`,
      createdAt: now,
    })

    return (await ctx.db.get(incident._id)) as Doc<'incidents'>
  },
})

export const assign = mutation({
  args: {
    incidentId: v.id('incidents'),
    officerUserId: v.union(v.id('users'), v.null()),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'incidents:manage')

    const incident = await loadIncident(ctx, args.incidentId)
    assertAssignable(incident)

    let officer: Doc<'users'> | null = null
    if (args.officerUserId) {
      officer = await ctx.db.get(args.officerUserId)
      if (!officer) {
        throw appError('OFFICER_NOT_FOUND', 'The selected user was not found.')
      }
      if (officer.status !== 'Active') {
        throw appError(
          'OFFICER_UNAVAILABLE',
          'The selected user is inactive.',
        )
      }
      if (
        officer.role !== 'Security Officer' &&
        officer.role !== 'Supervisor'
      ) {
        throw appError(
          'OFFICER_ROLE_INVALID',
          'Incidents can be assigned only to security officers or supervisors.',
        )
      }
    }

    const now = Date.now()
    await ctx.db.patch(incident._id, {
      assignedUserId: officer?._id ?? null,
      assignedOfficerId: officer
        ? (officer.officerId ?? officer._id)
        : null,
      assignedOfficerName: officer?.fullName ?? null,
      updatedAt: now,
    })

    await recordIncidentAction(ctx, {
      incidentId: incident._id,
      type: officer ? 'assigned' : 'unassigned',
      actor,
      description: officer
        ? `Assigned to ${officer.fullName}.`
        : 'Incident assignment cleared.',
      createdAt: now,
    })

    await recordActivity(ctx, {
      type: officer ? 'officer_assigned' : 'officer_unassigned',
      actor,
      targetType: 'incident',
      targetId: incident.incidentNumber,
      description: officer
        ? `Incident ${incident.incidentNumber} assigned to ${officer.fullName}.`
        : `Incident ${incident.incidentNumber} unassigned.`,
      createdAt: now,
    })

    return (await ctx.db.get(incident._id)) as Doc<'incidents'>
  },
})

export const startInvestigation = mutation({
  args: { incidentId: v.id('incidents') },
  handler: async (ctx, args) => {
    const actor = await requireWorkflowActor(ctx)
    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)
    assertTransition(incident, 'investigating')

    const now = Date.now()
    await ctx.db.patch(incident._id, {
      status: 'investigating',
      updatedAt: now,
    })

    await recordIncidentAction(ctx, {
      incidentId: incident._id,
      type: 'investigation_started',
      actor,
      description: 'Security investigation started.',
      createdAt: now,
    })

    await recordActivity(ctx, {
      type: 'investigation_started',
      actor,
      targetType: 'incident',
      targetId: incident.incidentNumber,
      description: `Investigation started for incident ${incident.incidentNumber}.`,
      createdAt: now,
    })

    return (await ctx.db.get(incident._id)) as Doc<'incidents'>
  },
})

export const addNote = mutation({
  args: {
    incidentId: v.id('incidents'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireWorkflowActor(ctx)
    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)

    if (incident.status !== 'investigating') {
      throw appError(
        'INVALID_TRANSITION',
        'Investigation notes can be added only while an incident is investigating.',
      )
    }

    const content = args.content.trim()
    if (!content) {
      throw appError(
        'NOTE_REQUIRED',
        'Investigation note content is required.',
      )
    }
    if (content.length > 4_000) {
      throw appError(
        'NOTE_TOO_LONG',
        'Investigation notes must be at most 4000 characters.',
      )
    }

    const now = Date.now()
    await ctx.db.patch(incident._id, { updatedAt: now })

    const noteId = await recordIncidentAction(ctx, {
      incidentId: incident._id,
      type: 'note_added',
      actor,
      description: 'Investigation note added.',
      noteContent: content,
      createdAt: now,
    })

    await recordActivity(ctx, {
      type: 'investigation_note_added',
      actor,
      targetType: 'incident',
      targetId: incident.incidentNumber,
      description: `Investigation note added to incident ${incident.incidentNumber}.`,
      createdAt: now,
    })

    return await ctx.db.get(noteId)
  },
})

export const resolve = mutation({
  args: {
    incidentId: v.id('incidents'),
    resolutionNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireWorkflowActor(ctx)
    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)
    assertTransition(incident, 'resolved')

    const resolutionNotes = args.resolutionNotes.trim()
    if (!resolutionNotes) {
      throw appError(
        'RESOLUTION_REQUIRED',
        'Resolution notes are required.',
      )
    }
    if (resolutionNotes.length > 4_000) {
      throw appError(
        'RESOLUTION_TOO_LONG',
        'Resolution notes must be at most 4000 characters.',
      )
    }

    const now = Date.now()
    await ctx.db.patch(incident._id, {
      status: 'resolved',
      resolvedAt: now,
      resolutionNotes,
      updatedAt: now,
    })

    await recordIncidentAction(ctx, {
      incidentId: incident._id,
      type: 'resolved',
      actor,
      description: 'Incident resolved after human verification.',
      noteContent: resolutionNotes,
      createdAt: now,
    })

    await recordActivity(ctx, {
      type: 'incident_resolved',
      actor,
      targetType: 'incident',
      targetId: incident.incidentNumber,
      description: `Incident ${incident.incidentNumber} resolved.`,
      createdAt: now,
    })

    return (await ctx.db.get(incident._id)) as Doc<'incidents'>
  },
})

export const markFalseAlarm = mutation({
  args: {
    incidentId: v.id('incidents'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireWorkflowActor(ctx)
    const incident = await loadIncident(ctx, args.incidentId)
    assertIncidentAccess(actor, incident)
    assertTransition(incident, 'false_alarm')

    const reason = args.reason.trim()
    if (!reason) {
      throw appError(
        'REASON_REQUIRED',
        'A false-alarm reason is required.',
      )
    }
    if (reason.length > 4_000) {
      throw appError(
        'REASON_TOO_LONG',
        'False-alarm reasons must be at most 4000 characters.',
      )
    }

    const now = Date.now()
    await ctx.db.patch(incident._id, {
      status: 'false_alarm',
      resolvedAt: now,
      resolutionNotes: reason,
      updatedAt: now,
    })

    await recordIncidentAction(ctx, {
      incidentId: incident._id,
      type: 'false_alarm',
      actor,
      description: `Marked false alarm: ${reason}`,
      noteContent: reason,
      createdAt: now,
    })

    await recordActivity(ctx, {
      type: 'false_alarm_decision',
      actor,
      targetType: 'incident',
      targetId: incident.incidentNumber,
      description: `Incident ${incident.incidentNumber} marked as a false alarm.`,
      createdAt: now,
    })

    return (await ctx.db.get(incident._id)) as Doc<'incidents'>
  },
})
