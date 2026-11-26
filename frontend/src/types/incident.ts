import type {
  BoundingBox,
  DetectionObjectClass,
  DetectionStatus,
} from './detection'
import type { DateTimeString } from './common'

export type IncidentObjectType = Exclude<DetectionObjectClass, 'person'>
export type IncidentPriority = 'low' | 'normal' | 'high' | 'critical'
export type IncidentStatus =
  | 'new'
  | 'acknowledged'
  | 'investigating'
  | 'resolved'
  | 'false_alarm'

export type IncidentActivityType =
  | 'detected'
  | 'created'
  | 'acknowledged'
  | 'assigned'
  | 'unassigned'
  | 'investigation_started'
  | 'note_added'
  | 'resolved'
  | 'false_alarm'

export interface SecurityOfficer {
  id: string
  name: string
  role: 'Administrator' | 'Security Officer' | 'Supervisor'
  status: 'Active' | 'Inactive'
  mock: true
}

export interface InvestigationNote {
  id: string
  incidentId: string
  authorId: string
  authorName: string
  content: string
  timestamp: DateTimeString
  mock: true
}

export interface IncidentActivity {
  id: string
  incidentId: string
  type: IncidentActivityType
  actorId: string | null
  actorName: string
  description: string
  timestamp: DateTimeString
  mock: true
}

export interface IncidentEvidenceSnapshot {
  areaId: string
  areaName: string
  detectionId: string
  cameraId: string
  cameraName: string
  location: string
  building: string
  objectClass: IncidentObjectType
  trackingId: number
  confidence: number
  timestamp: DateTimeString
  boundingBox: BoundingBox
  detectionStatus: DetectionStatus
  mock: true
}

export interface Incident {
  id: string
  incidentNumber: string
  detectionId: string
  cameraId: string
  cameraName: string
  areaId: string
  areaName: string
  location: string
  objectType: IncidentObjectType
  trackingId: number
  confidence: number
  unattendedDuration: number
  priority: IncidentPriority
  status: IncidentStatus
  assignedOfficerId: string | null
  assignedOfficerName: string | null
  description: string
  detectedAt: DateTimeString
  acknowledgedAt: DateTimeString | null
  resolvedAt: DateTimeString | null
  resolutionNotes: string | null
  evidenceSnapshot: IncidentEvidenceSnapshot
  mock: true
  createdAt: DateTimeString
  updatedAt: DateTimeString
}
