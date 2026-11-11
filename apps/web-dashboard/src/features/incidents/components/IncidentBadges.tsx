import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { IncidentPriority, IncidentStatus } from '../../../types'
import {
  incidentPriorityLabels,
  incidentStatusLabels,
} from '../incidentPresentation'

type BadgeTone = 'cyan' | 'green' | 'amber' | 'red' | 'slate'

const statusTones: Record<IncidentStatus, BadgeTone> = {
  new: 'red',
  acknowledged: 'amber',
  investigating: 'cyan',
  resolved: 'green',
  false_alarm: 'slate',
}

const priorityTones: Record<IncidentPriority, BadgeTone> = {
  low: 'slate',
  normal: 'cyan',
  high: 'amber',
  critical: 'red',
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <StatusBadge dot tone={statusTones[status]}>
      {incidentStatusLabels[status]}
    </StatusBadge>
  )
}

export function IncidentPriorityBadge({ priority }: { priority: IncidentPriority }) {
  return (
    <StatusBadge tone={priorityTones[priority]}>
      {incidentPriorityLabels[priority]}
    </StatusBadge>
  )
}
