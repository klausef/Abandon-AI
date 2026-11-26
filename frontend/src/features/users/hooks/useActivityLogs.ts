import { useSyncExternalStore } from 'react'
import { activityLogService, incidentService } from '../../../services'
import type { ActivityLog, ActivityLogType } from '../../../types'

const incidentTypes: Partial<Record<string, ActivityLogType>> = {
  acknowledged: 'incident_acknowledged',
  assigned: 'officer_assigned',
  note_added: 'investigation_note_added',
  resolved: 'incident_resolved',
  false_alarm: 'false_alarm_decision',
}

export function useActivityLogs() {
  const userLogs = useSyncExternalStore(
    activityLogService.subscribe,
    activityLogService.getSnapshot,
    activityLogService.getSnapshot,
  )
  useSyncExternalStore(
    incidentService.subscribe,
    incidentService.getSnapshot,
    incidentService.getSnapshot,
  )
  const incidentLogs: ActivityLog[] = incidentService
    .getAllActivities()
    .filter((activity) => incidentTypes[activity.type])
    .map((activity) => ({
      id: `INC-${activity.id}`,
      type: incidentTypes[activity.type]!,
      actorId: activity.actorId ?? 'SYSTEM',
      actorName: activity.actorName,
      targetId: activity.incidentId,
      description: activity.description,
      timestamp: activity.timestamp,
      mock: true,
    }))
  return [...userLogs, ...incidentLogs].sort(
    (first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp),
  )
}
