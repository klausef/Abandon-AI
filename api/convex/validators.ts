import { v } from 'convex/values'

/** Canonical Convex validators shared by the schema and server functions. */

export const userRole = v.union(
  v.literal('Administrator'),
  v.literal('Security Officer'),
  v.literal('Supervisor'),
)

export const userStatus = v.union(v.literal('Active'), v.literal('Inactive'))

export const dataSource = v.union(
  v.literal('MOCK'),
  v.literal('LIVE'),
  v.literal('PROCESSOR'),
)

export const cameraStatus = v.union(
  v.literal('Online'),
  v.literal('Offline'),
  v.literal('Maintenance'),
)

export const cameraType = v.union(
  v.literal('IP Camera'),
  v.literal('Dome Camera'),
  v.literal('Bullet Camera'),
)

export const detectionObjectClass = v.union(
  v.literal('person'),
  v.literal('backpack'),
  v.literal('handbag'),
  v.literal('suitcase'),
  v.literal('duffel_bag'),
  v.literal('shopping_bag'),
  v.literal('briefcase'),
  v.literal('bag'),
  v.literal('bottle'),
  v.literal('mug'),
  v.literal('cup'),
  v.literal('box'),
  v.literal('package'),
  v.literal('parcel'),
)

/** Objects that may create an abandoned-object incident. Person is excluded. */
export const incidentObjectType = v.union(
  v.literal('backpack'),
  v.literal('handbag'),
  v.literal('suitcase'),
  v.literal('duffel_bag'),
  v.literal('shopping_bag'),
  v.literal('briefcase'),
  v.literal('bag'),
  v.literal('bottle'),
  v.literal('mug'),
  v.literal('cup'),
  v.literal('box'),
  v.literal('package'),
  v.literal('parcel'),
)

export const detectionStatus = v.union(
  v.literal('detected'),
  v.literal('tracking'),
  v.literal('stationary'),
  v.literal('unattended_monitoring'),
  v.literal('potential_incident'),
)

export const trackState = v.union(
  v.literal('OBSERVED'),
  v.literal('MONITORING'),
  v.literal('POTENTIAL_UNATTENDED'),
  v.literal('ALERTED'),
  v.literal('CLEARED'),
)

export const processingStatus = v.union(
  v.literal('idle'),
  v.literal('processing'),
  v.literal('paused'),
  v.literal('error'),
)

export const processorStatus = v.union(v.literal('active'), v.literal('revoked'))

export const incidentPriority = v.union(
  v.literal('low'),
  v.literal('normal'),
  v.literal('high'),
  v.literal('critical'),
)

export const incidentStatus = v.union(
  v.literal('new'),
  v.literal('acknowledged'),
  v.literal('investigating'),
  v.literal('resolved'),
  v.literal('false_alarm'),
)

export const incidentActionType = v.union(
  v.literal('detected'),
  v.literal('created'),
  v.literal('acknowledged'),
  v.literal('assigned'),
  v.literal('unassigned'),
  v.literal('investigation_started'),
  v.literal('note_added'),
  v.literal('resolved'),
  v.literal('false_alarm'),
)

export const modelProvider = v.union(
  v.literal('roboflow'),
  v.literal('pretrained'),
  v.literal('custom'),
  v.literal('mock'),
)

export const modelType = v.union(
  v.literal('pretrained'),
  v.literal('custom'),
  v.literal('mock'),
  v.literal('unknown'),
)

export const eventType = v.union(
  v.literal('processor_heartbeat'),
  v.literal('model_information'),
  v.literal('camera_processing_status'),
  v.literal('detection'),
  v.literal('track_summary'),
  v.literal('person_association'),
  v.literal('potential_unattended_object'),
)

export const activityLogType = v.union(
  v.literal('processor_registered'),
  v.literal('processor_revoked'),
  v.literal('camera_processing_status_changed'),
  v.literal('camera_created'),
  v.literal('camera_updated'),
  v.literal('camera_deleted'),
  v.literal('monitoring_zone_created'),
  v.literal('monitoring_zone_updated'),
  v.literal('model_registered'),
  v.literal('model_verified'),
  v.literal('detection_recorded'),
  v.literal('track_updated'),
  v.literal('person_association_recorded'),
  v.literal('incident_created'),
  v.literal('incident_acknowledged'),
  v.literal('officer_assigned'),
  v.literal('officer_unassigned'),
  v.literal('investigation_started'),
  v.literal('investigation_note_added'),
  v.literal('incident_resolved'),
  v.literal('false_alarm_decision'),
  v.literal('duplicate_alert_suppressed'),
  v.literal('user_role_changed'),
  v.literal('user_status_changed'),
)

/** Coordinates normalized from 0 to 1 for responsive overlays. */
export const boundingBox = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
})

export const normalizedPoint = v.object({
  x: v.number(),
  y: v.number(),
})

/**
 * Metadata describing the detection that produced an incident.
 *
 * Phase 7A stores metadata only. No video frames or full recordings are
 * written to Convex.
 */
export const evidenceMetadata = v.object({
  detectionId: v.union(v.id('detections'), v.null()),
  externalDetectionId: v.union(v.string(), v.null()),
  cameraId: v.id('cameras'),
  cameraExternalId: v.string(),
  cameraName: v.string(),
  location: v.string(),
  building: v.string(),
  objectClass: incidentObjectType,
  trackingId: v.number(),
  confidence: v.number(),
  timestamp: v.number(),
  boundingBox: v.union(boundingBox, v.null()),
  detectionStatus: detectionStatus,
})
