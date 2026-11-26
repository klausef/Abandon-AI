import { Pause, Radio, WifiOff, Wrench } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Camera, CameraStatus } from '../../../types'

type BadgeTone = 'cyan' | 'green' | 'amber' | 'red' | 'slate'

const connectionTones: Record<CameraStatus, BadgeTone> = {
  Online: 'green',
  Offline: 'red',
  Maintenance: 'amber',
}

export function CameraConnectionStatusBadge({
  status,
}: {
  status: CameraStatus
}) {
  return (
    <StatusBadge dot tone={connectionTones[status]}>
      {status}
    </StatusBadge>
  )
}

export function CameraMonitoringStatusBadge({ camera }: { camera: Camera }) {
  if (camera.status === 'Offline') {
    return (
      <StatusBadge tone="red">
        <WifiOff aria-hidden="true" className="size-3" />
        Camera Offline
      </StatusBadge>
    )
  }

  if (camera.status === 'Maintenance') {
    return (
      <StatusBadge tone="amber">
        <Wrench aria-hidden="true" className="size-3" />
        Under Maintenance
      </StatusBadge>
    )
  }

  if (camera.monitoringEnabled) {
    return (
      <StatusBadge tone="green">
        <Radio aria-hidden="true" className="size-3" />
        Monitoring Active
      </StatusBadge>
    )
  }

  return (
    <StatusBadge tone="slate">
      <Pause aria-hidden="true" className="size-3" />
      Monitoring Paused
    </StatusBadge>
  )
}
