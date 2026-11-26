import type { Camera } from '../../types'

export function getMonitoringState(camera: Camera): string {
  if (camera.status === 'Offline') {
    return 'Camera Offline'
  }

  if (camera.status === 'Maintenance') {
    return 'Under Maintenance'
  }

  return camera.monitoringEnabled ? 'Monitoring Active' : 'Monitoring Paused'
}
