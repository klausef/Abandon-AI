import type {
  Camera,
  Detection,
  Incident,
  IncidentPriority,
  IncidentStatus,
} from '../../types'

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  investigating: 'Investigating',
  resolved: 'Resolved',
  false_alarm: 'False Alarm',
}

export const incidentPriorityLabels: Record<IncidentPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
}

export type IncidentAction =
  | 'view'
  | 'acknowledge'
  | 'assign'
  | 'investigate'
  | 'resolve'
  | 'false_alarm'

export function getIncidentActions(incident: Incident): readonly IncidentAction[] {
  if (incident.status === 'new') {
    return ['view', 'acknowledge', 'false_alarm']
  }
  if (incident.status === 'acknowledged') {
    return ['view', 'assign', 'investigate', 'false_alarm']
  }
  if (incident.status === 'investigating') {
    return ['view', 'assign', 'resolve', 'false_alarm']
  }
  return ['view']
}

export function resolveIncidentCamera(
  incident: Incident,
  cameras: readonly Camera[],
) {
  const camera = cameras.find((item) => item.id === incident.cameraId)
  return camera
    ? { ...camera, isRemoved: false }
    : {
        id: incident.cameraId,
        areaId: incident.areaId,
        name: incident.cameraName,
        location: incident.location,
        building: incident.evidenceSnapshot.building,
        floor: 'Unavailable',
        status: 'Offline' as const,
        cameraType: 'IP Camera' as const,
        ipAddress: '',
        monitoringEnabled: false,
        resolution: 'Unavailable',
        installedDate: '',
        lastConnection: incident.detectedAt,
        description: 'Preserved camera reference',
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
        source: 'MOCK' as const,
        isRemoved: true,
      }
}

export function resolveIncidentDetection(
  incident: Incident,
  detections: readonly Detection[],
): Detection {
  const detection = detections.find((item) => item.id === incident.detectionId)
  if (detection) return detection

  const evidence = incident.evidenceSnapshot
  return {
    id: evidence.detectionId,
    cameraId: evidence.cameraId,
    objectClass: evidence.objectClass,
    trackingId: evidence.trackingId,
    confidence: evidence.confidence,
    timestamp: evidence.timestamp,
    boundingBox: { ...evidence.boundingBox },
    status: evidence.detectionStatus,
    cameraSnapshot: {
      areaId: evidence.areaId,
      areaName: evidence.areaName,
      name: evidence.cameraName,
      location: evidence.location,
      building: evidence.building,
    },
    mock: true,
  }
}
