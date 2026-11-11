import { z } from 'zod'

export const DETECTION_OBJECT_CLASSES = [
  'person',
  'backpack',
  'handbag',
  'suitcase',
  'duffel_bag',
  'shopping_bag',
  'briefcase',
  'bag',
  'bottle',
  'mug',
  'cup',
  'box',
  'package',
  'parcel',
] as const

export const INCIDENT_OBJECT_CLASSES = [
  'backpack',
  'handbag',
  'suitcase',
  'duffel_bag',
  'shopping_bag',
  'briefcase',
  'bag',
  'bottle',
  'mug',
  'cup',
  'box',
  'package',
  'parcel',
] as const

export type DetectionObjectClass =
  (typeof DETECTION_OBJECT_CLASSES)[number]
export type IncidentObjectClass = Exclude<DetectionObjectClass, 'person'>
export type DetectionState =
  | 'detected'
  | 'tracking'
  | 'stationary'
  | 'unattended_monitoring'
  | 'potential_incident'
export type TrackState =
  | 'OBSERVED'
  | 'MONITORING'
  | 'POTENTIAL_UNATTENDED'
  | 'ALERTED'
  | 'CLEARED'
export type ProcessingState = 'idle' | 'processing' | 'paused' | 'error'
export type ModelProviderName = 'roboflow' | 'pretrained' | 'custom' | 'mock'
export type ModelKind = 'pretrained' | 'custom' | 'mock' | 'unknown'

export interface NormalizedBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface NormalizedModel {
  provider: ModelProviderName
  name: string
  version: string
  modelType: ModelKind
  declaredSupportedClasses: readonly string[]
}

export interface NormalizedObservation {
  observedAt: number
  personTrackingId: number | null
  distanceNormalized: number | null
  overlapRatio: number | null
  confidence: number | null
}

export interface NormalizedPersonAssociation {
  associatedPersonObserved: boolean
  observationWindowSeconds: number
  associationConfidence: number | null
  nearestPersonTrackingId: number | null
  distanceNormalized: number | null
  overlapRatio: number | null
  observations: readonly NormalizedObservation[]
}

interface NormalizedBase {
  eventId: string
  idempotencyKey: string
  deviceId: string
  occurredAt: number
}

export interface NormalizedHeartbeat extends NormalizedBase {
  eventType: 'processor_heartbeat'
  status: ProcessingState
  processorVersion: string | null
  cameraExternalId: string | null
  sessionId: string | null
  fps: number | null
  inferenceLatencyMs: number | null
  queueDepth: number | null
}

export interface NormalizedModelInformation extends NormalizedBase {
  eventType: 'model_information'
  model: NormalizedModel
  cameraExternalId: string | null
}

export interface NormalizedCameraProcessingStatus extends NormalizedBase {
  eventType: 'camera_processing_status'
  cameraExternalId: string
  status: ProcessingState
  sessionId: string | null
  message: string | null
}

export interface NormalizedDetection extends NormalizedBase {
  eventType: 'detection'
  cameraExternalId: string
  sessionId: string
  trackingId: number
  objectClass: DetectionObjectClass
  confidence: number
  boundingBox: NormalizedBoundingBox
  status: DetectionState
  zoneExternalId: string | null
  model: NormalizedModel | null
}

export interface NormalizedTrackSummary extends NormalizedBase {
  eventType: 'track_summary'
  cameraExternalId: string
  sessionId: string
  trackingId: number
  objectClass: DetectionObjectClass
  confidence: number
  boundingBox: NormalizedBoundingBox | null
  previousBoundingBox: NormalizedBoundingBox | null
  firstSeenAt: number | null
  lastSeenAt: number | null
  stationarySince: number | null
  stationaryDurationSeconds: number
  state: TrackState
  zoneExternalId: string | null
  model: NormalizedModel | null
}

export interface NormalizedPersonAssociationEvent extends NormalizedBase {
  eventType: 'person_association'
  cameraExternalId: string
  sessionId: string
  trackingId: number
  objectClass: IncidentObjectClass
  personAssociation: NormalizedPersonAssociation
}

export interface NormalizedPotentialIncident extends NormalizedBase {
  eventType: 'potential_unattended_object'
  cameraExternalId: string
  sessionId: string
  trackingId: number
  objectClass: IncidentObjectClass
  confidence: number
  stationaryDurationSeconds: number
  boundingBox: NormalizedBoundingBox | null
  zoneExternalId: string | null
  personAssociation: NormalizedPersonAssociation | null
  model: NormalizedModel | null
}

export type NormalizedEvent =
  | NormalizedHeartbeat
  | NormalizedModelInformation
  | NormalizedCameraProcessingStatus
  | NormalizedDetection
  | NormalizedTrackSummary
  | NormalizedPersonAssociationEvent
  | NormalizedPotentialIncident

export class EventValidationError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super('The event payload failed validation.')
    this.name = 'EventValidationError'
    this.issues = issues
  }
}

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
    'must start with an alphanumeric character and contain only letters, numbers, dot, underscore, colon, or hyphen',
  )

const idempotencyKey = z
  .string()
  .min(8)
  .max(200)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
    'must be a stable identifier of 8 to 200 characters',
  )

const isoDateTime = z.iso.datetime({ offset: true }).max(64)

const confidence = z.number().finite().min(0).max(1)
const normalizedCoordinate = z.number().finite().min(0).max(1)
const positiveNormalizedSize = z.number().finite().gt(0).max(1)
const trackingId = z.number().int().min(0).max(2_000_000_000)
const durationSeconds = z.number().finite().min(0).max(604_800)
const observationWindowSeconds = z.number().finite().min(0).max(86_400)

const boundingBox = z
  .strictObject({
    x: normalizedCoordinate,
    y: normalizedCoordinate,
    width: positiveNormalizedSize,
    height: positiveNormalizedSize,
  })
  .refine(
    (box) => box.x + box.width <= 1.000_001 && box.y + box.height <= 1.000_001,
    { message: 'must fit inside the normalized frame' },
  )

const objectClass = z.enum(DETECTION_OBJECT_CLASSES)
const incidentObjectClass = z.enum(INCIDENT_OBJECT_CLASSES)
const detectionState = z.enum([
  'detected',
  'tracking',
  'stationary',
  'unattended_monitoring',
  'potential_incident',
])
const trackState = z.enum([
  'OBSERVED',
  'MONITORING',
  'POTENTIAL_UNATTENDED',
  'ALERTED',
  'CLEARED',
])
const processingState = z.enum(['idle', 'processing', 'paused', 'error'])

const modelSchema = z.strictObject({
  provider: z.enum(['roboflow', 'pretrained', 'custom', 'mock']),
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(64),
  model_type: z.enum(['pretrained', 'custom', 'mock', 'unknown']).optional(),
  supported_classes: z.array(z.string().min(1).max(64)).max(200).optional(),
})

const observationSchema = z.strictObject({
  observed_at: isoDateTime,
  person_tracking_id: trackingId.optional(),
  distance_normalized: z.number().finite().min(0).max(10).optional(),
  overlap_ratio: confidence.optional(),
  confidence: confidence.optional(),
})

const personAssociationSchema = z.strictObject({
  associated_person_observed: z.boolean(),
  observation_window_seconds: observationWindowSeconds,
  association_confidence: confidence.optional(),
  nearest_person_tracking_id: trackingId.optional(),
  distance_normalized: z.number().finite().min(0).max(10).optional(),
  overlap_ratio: confidence.optional(),
  observations: z.array(observationSchema).max(50).optional(),
})

const baseFields = {
  schema_version: z.literal('1.0').default('1.0'),
  event_id: identifier,
  idempotency_key: idempotencyKey,
  processor_device_id: identifier,
  occurred_at: isoDateTime,
}

const heartbeatEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('processor_heartbeat'),
  status: processingState,
  processor_version: z.string().min(1).max(64).optional(),
  camera_id: identifier.optional(),
  processing_session_id: identifier.optional(),
  metrics: z
    .strictObject({
      fps: z.number().finite().min(0).max(1_000).optional(),
      inference_latency_ms: z.number().finite().min(0).max(600_000).optional(),
      queue_depth: z.number().int().min(0).max(1_000_000).optional(),
    })
    .optional(),
})

const modelInformationEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('model_information'),
  model: modelSchema,
  camera_id: identifier.optional(),
})

const cameraProcessingStatusEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('camera_processing_status'),
  camera_id: identifier,
  status: processingState,
  processing_session_id: identifier.optional(),
  message: z.string().max(500).optional(),
})

const detectionEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('detection'),
  camera_id: identifier,
  processing_session_id: identifier,
  tracking_id: trackingId,
  object_class: objectClass,
  confidence,
  bounding_box: boundingBox,
  status: detectionState,
  monitoring_zone_id: identifier.optional(),
  model: modelSchema.optional(),
})

const trackSummaryEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('track_summary'),
  camera_id: identifier,
  processing_session_id: identifier,
  tracking_id: trackingId,
  object_class: objectClass,
  confidence,
  bounding_box: boundingBox.optional(),
  previous_bounding_box: boundingBox.optional(),
  first_seen_at: isoDateTime.optional(),
  last_seen_at: isoDateTime.optional(),
  stationary_since: isoDateTime.optional(),
  stationary_duration_seconds: durationSeconds,
  state: trackState,
  monitoring_zone_id: identifier.optional(),
  model: modelSchema.optional(),
})

const personAssociationEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('person_association'),
  camera_id: identifier,
  processing_session_id: identifier,
  tracking_id: trackingId,
  object_class: incidentObjectClass,
  associated_person_observed: z.boolean(),
  observation_window_seconds: observationWindowSeconds,
  association_confidence: confidence.optional(),
  nearest_person_tracking_id: trackingId.optional(),
  distance_normalized: z.number().finite().min(0).max(10).optional(),
  overlap_ratio: confidence.optional(),
  observations: z.array(observationSchema).max(50).optional(),
})

const potentialIncidentEvent = z.strictObject({
  ...baseFields,
  event_type: z.literal('potential_unattended_object'),
  camera_id: identifier,
  processing_session_id: identifier,
  tracking_id: trackingId,
  object_class: incidentObjectClass,
  confidence,
  stationary_duration_seconds: durationSeconds,
  bounding_box: boundingBox.optional(),
  monitoring_zone_id: identifier.optional(),
  person_association: personAssociationSchema.optional(),
  model: modelSchema.optional(),
})

export const eventPayloadSchema = z.discriminatedUnion('event_type', [
  heartbeatEvent,
  modelInformationEvent,
  cameraProcessingStatusEvent,
  detectionEvent,
  trackSummaryEvent,
  personAssociationEvent,
  potentialIncidentEvent,
])

function nullable<T>(value: T | undefined): T | null {
  return value ?? null
}

function normalizeModel(
  model: z.infer<typeof modelSchema> | undefined,
): NormalizedModel | null {
  if (!model) {
    return null
  }
  return {
    provider: model.provider,
    name: model.name,
    version: model.version,
    modelType: model.model_type ?? 'unknown',
    declaredSupportedClasses: model.supported_classes ?? [],
  }
}

function normalizeObservation(
  observation: z.infer<typeof observationSchema>,
): NormalizedObservation {
  return {
    observedAt: Date.parse(observation.observed_at),
    personTrackingId: nullable(observation.person_tracking_id),
    distanceNormalized: nullable(observation.distance_normalized),
    overlapRatio: nullable(observation.overlap_ratio),
    confidence: nullable(observation.confidence),
  }
}

function normalizePersonAssociation(
  association: z.infer<typeof personAssociationSchema>,
): NormalizedPersonAssociation {
  return {
    associatedPersonObserved: association.associated_person_observed,
    observationWindowSeconds: association.observation_window_seconds,
    associationConfidence: nullable(association.association_confidence),
    nearestPersonTrackingId: nullable(association.nearest_person_tracking_id),
    distanceNormalized: nullable(association.distance_normalized),
    overlapRatio: nullable(association.overlap_ratio),
    observations: (association.observations ?? []).map(normalizeObservation),
  }
}

function formatIssues(error: z.ZodError): readonly string[] {
  return error.issues
    .slice(0, 10)
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : `body: ${issue.message}`,
    )
}

/**
 * Validates an untrusted processor payload and converts it into a normalized
 * event with camelCase fields and millisecond timestamps.
 */
export function parseEventPayload(input: unknown): NormalizedEvent {
  const result = eventPayloadSchema.safeParse(input)
  if (!result.success) {
    throw new EventValidationError(formatIssues(result.error))
  }

  const payload = result.data
  const base = {
    eventId: payload.event_id,
    idempotencyKey: payload.idempotency_key,
    deviceId: payload.processor_device_id,
    occurredAt: Date.parse(payload.occurred_at),
  }

  switch (payload.event_type) {
    case 'processor_heartbeat':
      return {
        ...base,
        eventType: payload.event_type,
        status: payload.status,
        processorVersion: nullable(payload.processor_version),
        cameraExternalId: nullable(payload.camera_id),
        sessionId: nullable(payload.processing_session_id),
        fps: nullable(payload.metrics?.fps),
        inferenceLatencyMs: nullable(payload.metrics?.inference_latency_ms),
        queueDepth: nullable(payload.metrics?.queue_depth),
      }
    case 'model_information':
      return {
        ...base,
        eventType: payload.event_type,
        model: normalizeModel(payload.model) as NormalizedModel,
        cameraExternalId: nullable(payload.camera_id),
      }
    case 'camera_processing_status':
      return {
        ...base,
        eventType: payload.event_type,
        cameraExternalId: payload.camera_id,
        status: payload.status,
        sessionId: nullable(payload.processing_session_id),
        message: nullable(payload.message),
      }
    case 'detection':
      return {
        ...base,
        eventType: payload.event_type,
        cameraExternalId: payload.camera_id,
        sessionId: payload.processing_session_id,
        trackingId: payload.tracking_id,
        objectClass: payload.object_class,
        confidence: payload.confidence,
        boundingBox: payload.bounding_box,
        status: payload.status,
        zoneExternalId: nullable(payload.monitoring_zone_id),
        model: normalizeModel(payload.model),
      }
    case 'track_summary':
      return {
        ...base,
        eventType: payload.event_type,
        cameraExternalId: payload.camera_id,
        sessionId: payload.processing_session_id,
        trackingId: payload.tracking_id,
        objectClass: payload.object_class,
        confidence: payload.confidence,
        boundingBox: nullable(payload.bounding_box),
        previousBoundingBox: nullable(payload.previous_bounding_box),
        firstSeenAt:
          payload.first_seen_at === undefined
            ? null
            : Date.parse(payload.first_seen_at),
        lastSeenAt:
          payload.last_seen_at === undefined
            ? null
            : Date.parse(payload.last_seen_at),
        stationarySince:
          payload.stationary_since === undefined
            ? null
            : Date.parse(payload.stationary_since),
        stationaryDurationSeconds: payload.stationary_duration_seconds,
        state: payload.state,
        zoneExternalId: nullable(payload.monitoring_zone_id),
        model: normalizeModel(payload.model),
      }
    case 'person_association':
      return {
        ...base,
        eventType: payload.event_type,
        cameraExternalId: payload.camera_id,
        sessionId: payload.processing_session_id,
        trackingId: payload.tracking_id,
        objectClass: payload.object_class,
        personAssociation: normalizePersonAssociation({
          associated_person_observed: payload.associated_person_observed,
          observation_window_seconds: payload.observation_window_seconds,
          association_confidence: payload.association_confidence,
          nearest_person_tracking_id: payload.nearest_person_tracking_id,
          distance_normalized: payload.distance_normalized,
          overlap_ratio: payload.overlap_ratio,
          observations: payload.observations,
        }),
      }
    case 'potential_unattended_object':
      return {
        ...base,
        eventType: payload.event_type,
        cameraExternalId: payload.camera_id,
        sessionId: payload.processing_session_id,
        trackingId: payload.tracking_id,
        objectClass: payload.object_class,
        confidence: payload.confidence,
        stationaryDurationSeconds: payload.stationary_duration_seconds,
        boundingBox: nullable(payload.bounding_box),
        zoneExternalId: nullable(payload.monitoring_zone_id),
        personAssociation: payload.person_association
          ? normalizePersonAssociation(payload.person_association)
          : null,
        model: normalizeModel(payload.model),
      }
  }
}
