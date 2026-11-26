import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { DetectionStatus } from '../../../types'
import { detectionStatusLabels } from '../../../utils/detection'

type BadgeTone = 'cyan' | 'green' | 'amber' | 'red' | 'slate'

const statusTones: Record<DetectionStatus, BadgeTone> = {
  detected: 'cyan',
  tracking: 'green',
  stationary: 'slate',
  unattended_monitoring: 'amber',
  potential_incident: 'red',
}

export function DetectionStatusBadge({ status }: { status: DetectionStatus }) {
  return (
    <StatusBadge dot tone={statusTones[status]}>
      {detectionStatusLabels[status]}
    </StatusBadge>
  )
}
