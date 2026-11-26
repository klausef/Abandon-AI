import type { DateTimeString } from './common'

export type ActivityLogType =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'account_status_changed'
  | 'incident_acknowledged'
  | 'officer_assigned'
  | 'investigation_note_added'
  | 'incident_resolved'
  | 'false_alarm_decision'

export interface ActivityLog {
  id: string
  type: ActivityLogType
  actorId: string
  actorName: string
  targetId: string
  description: string
  timestamp: DateTimeString
  mock: true
}
