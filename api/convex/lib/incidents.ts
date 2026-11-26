import type { Infer } from 'convex/values'
import type { Doc } from '../_generated/dataModel'
import { incidentPriority, incidentStatus } from '../validators'
import { appError, type AppUser } from './auth'

export type IncidentStatus = Infer<typeof incidentStatus>
export type IncidentPriority = Infer<typeof incidentPriority>

const allowedTransitions: Record<IncidentStatus, readonly IncidentStatus[]> = {
  new: ['acknowledged', 'false_alarm'],
  acknowledged: ['investigating', 'false_alarm'],
  investigating: ['resolved', 'false_alarm'],
  resolved: [],
  false_alarm: [],
}

export const assignableStatuses: readonly IncidentStatus[] = [
  'new',
  'acknowledged',
  'investigating',
]

export function assertTransition(
  incident: Doc<'incidents'>,
  next: IncidentStatus,
): void {
  if (!allowedTransitions[incident.status].includes(next)) {
    throw appError(
      'INVALID_TRANSITION',
      `An incident in status "${incident.status}" cannot move to "${next}".`,
    )
  }
}

export function assertAssignable(incident: Doc<'incidents'>): void {
  if (!assignableStatuses.includes(incident.status)) {
    throw appError(
      'INVALID_TRANSITION',
      'Officers can be assigned only to new, acknowledged, or investigating incidents.',
    )
  }
}

export function canManageAllIncidents(user: AppUser): boolean {
  return user.role === 'Administrator' || user.role === 'Supervisor'
}

/**
 * Administrators and supervisors can reach every incident. Security officers
 * can reach only incidents assigned to their linked user or officer code.
 */
export function canAccessIncident(
  user: AppUser,
  incident: Doc<'incidents'>,
): boolean {
  if (canManageAllIncidents(user)) {
    return true
  }
  if (incident.assignedUserId !== null && incident.assignedUserId === user._id) {
    return true
  }
  return (
    user.officerId !== null && incident.assignedOfficerId === user.officerId
  )
}

export function assertIncidentAccess(
  user: AppUser,
  incident: Doc<'incidents'>,
): void {
  if (!canAccessIncident(user, incident)) {
    throw appError(
      'FORBIDDEN',
      'Security officers can access only incidents assigned to them.',
    )
  }
}

/**
 * Demonstration default copied from the existing dashboard mock workflow.
 * This is not a validated campus safety threshold and must be reviewed
 * before production use.
 */
export function demoPriorityForConfidence(
  confidence: number,
): IncidentPriority {
  return confidence >= 0.95 ? 'critical' : 'high'
}

export function formatIncidentNumber(
  year: number,
  sequence: number,
): string {
  return `INC-${year}-${String(sequence).padStart(4, '0')}`
}
