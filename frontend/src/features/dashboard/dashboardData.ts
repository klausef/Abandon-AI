import type { Camera, Detection, Incident } from '../../types'

export interface DashboardData {
  cameras: readonly Camera[]
  detections: readonly Detection[]
  incidents: readonly Incident[]
}

export interface DashboardMetrics {
  totalCameras: number
  onlineCameras: number
  offlineCameras: number
  monitoringEnabled: number
  totalDetections: number
  trackingDetections: number
  activeIncidents: number
  newIncidents: number
  investigatingIncidents: number
  resolvedIncidents: number
}

export interface IncidentActivityPoint {
  hour: string
  incidents: number
  resolved: number
}

const closedIncidentStatuses = new Set<Incident['status']>([
  'resolved',
  'false_alarm',
])

export function calculateDashboardMetrics(
  data: DashboardData,
): DashboardMetrics {
  return {
    totalCameras: data.cameras.length,
    onlineCameras: data.cameras.filter((camera) => camera.status === 'Online')
      .length,
    offlineCameras: data.cameras.filter((camera) => camera.status === 'Offline')
      .length,
    monitoringEnabled: data.cameras.filter(
      (camera) => camera.monitoringEnabled,
    ).length,
    totalDetections: data.detections.length,
    trackingDetections: data.detections.filter(
      (detection) => detection.status === 'tracking',
    ).length,
    activeIncidents: data.incidents.filter(
      (incident) => !closedIncidentStatuses.has(incident.status),
    ).length,
    newIncidents: data.incidents.filter((incident) => incident.status === 'new')
      .length,
    investigatingIncidents: data.incidents.filter(
      (incident) => incident.status === 'investigating',
    ).length,
    resolvedIncidents: data.incidents.filter(
      (incident) => incident.status === 'resolved',
    ).length,
  }
}

function extractLocalHour(timestamp: string): number {
  const match = /T(\d{2}):/.exec(timestamp)
  return match ? Number(match[1]) : new Date(timestamp).getHours()
}

export function buildIncidentActivity(
  incidents: readonly Incident[],
): readonly IncidentActivityPoint[] {
  if (incidents.length === 0) {
    return []
  }

  const latestHour = Math.max(
    ...incidents.map((incident) => extractLocalHour(incident.detectedAt)),
  )
  const startHour = Math.max(0, Math.min(18, latestHour - 2))

  return Array.from({ length: 6 }, (_, index) => {
    const hour = startHour + index
    const incidentsInHour = incidents.filter(
      (incident) => extractLocalHour(incident.detectedAt) === hour,
    )

    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      incidents: incidentsInHour.length,
      resolved: incidentsInHour.filter(
        (incident) => incident.status === 'resolved',
      ).length,
    }
  })
}

export function getLatestCameraUpdate(
  cameras: readonly Camera[],
): string | undefined {
  if (cameras.length === 0) {
    return undefined
  }

  return cameras.reduce((latest, camera) =>
    Date.parse(camera.lastConnection) > Date.parse(latest)
      ? camera.lastConnection
      : latest,
  cameras[0].lastConnection)
}
