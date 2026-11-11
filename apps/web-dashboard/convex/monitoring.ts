import type { Infer } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { query } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import { requirePermission } from './lib/permissions'
import { incidentStatus } from './validators'

type IncidentStatus = Infer<typeof incidentStatus>

const countedStatuses: readonly IncidentStatus[] = [
  'new',
  'acknowledged',
  'investigating',
  'resolved',
  'false_alarm',
]

function emptyIncidentCounts(): Record<IncidentStatus, number> {
  return {
    new: 0,
    acknowledged: 0,
    investigating: 0,
    resolved: 0,
    false_alarm: 0,
  }
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'monitoring:view')

    const [cameras, zones, processors, heartbeats, recentDetectionScan] =
      await Promise.all([
        ctx.db.query('cameras').collect(),
        ctx.db.query('monitoringZones').collect(),
        ctx.db.query('processorDevices').collect(),
        ctx.db
          .query('processorHeartbeats')
          .withIndex('by_reportedAt')
          .order('desc')
          .take(20),
        ctx.db.query('detections').order('desc').take(500),
      ])

    const incidentCounts = emptyIncidentCounts()

    if (actor.role === 'Security Officer') {
      const assignedIncidents = await ctx.db
        .query('incidents')
        .withIndex('by_assignedUserId', (query) =>
          query.eq('assignedUserId', actor._id),
        )
        .collect()

      for (const incident of assignedIncidents) {
        incidentCounts[incident.status] += 1
      }

      const trackKeys = new Set(
        assignedIncidents.map((incident: Doc<'incidents'>) => incident.trackKey),
      )
      const recentDetections = recentDetectionScan
        .filter((detection) => trackKeys.has(detection.trackKey))
        .sort((first, second) => second.occurredAt - first.occurredAt)
        .slice(0, 20)

      return {
        cameras,
        zones,
        processors,
        heartbeats,
        recentDetections,
        incidentCounts,
        generatedAt: Date.now(),
      }
    }

    for (const status of countedStatuses) {
      const incidents = await ctx.db
        .query('incidents')
        .withIndex('by_status_createdAt', (query) =>
          query.eq('status', status),
        )
        .collect()
      incidentCounts[status] = incidents.length
    }

    return {
      cameras,
      zones,
      processors,
      heartbeats,
      recentDetections: recentDetectionScan.slice(0, 20),
      incidentCounts,
      generatedAt: Date.now(),
    }
  },
})
