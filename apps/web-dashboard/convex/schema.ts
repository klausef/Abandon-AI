import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  activityLogType,
  boundingBox,
  cameraStatus,
  cameraType,
  dataSource,
  detectionObjectClass,
  detectionStatus,
  eventType,
  evidenceMetadata,
  incidentActionType,
  incidentObjectType,
  incidentPriority,
  incidentStatus,
  modelProvider,
  modelType,
  normalizedPoint,
  processingStatus,
  processorStatus,
  trackState,
  userRole,
  userStatus,
} from './validators'

/**
 * Canonical application schema.
 *
 * Convex document identifiers are internal. Stable external identifiers
 * (camera codes such as CAM-001, processor device IDs, event IDs, and
 * session-scoped track keys) are retained alongside them so the Python
 * processor can reference records without knowing Convex internals.
 */
export default defineSchema({
  users: defineTable({
    /** Value of `identity.tokenIdentifier` from the identity provider. */
    tokenIdentifier: v.string(),
    email: v.string(),
    fullName: v.string(),
    badgeNumber: v.string(),
    role: userRole,
    status: userStatus,
    /** External officer code, for example SEC-001. */
    officerId: v.union(v.string(), v.null()),
    source: dataSource,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_email', ['email'])
    .index('by_officerId', ['officerId'])
    .index('by_role', ['role']),

  cameras: defineTable({
    externalId: v.string(),
    name: v.string(),
    location: v.string(),
    building: v.string(),
    floor: v.string(),
    cameraType,
    /** Simulated private-network label. No camera connection is attempted. */
    ipAddress: v.string(),
    status: cameraStatus,
    monitoringEnabled: v.boolean(),
    resolution: v.string(),
    installedDate: v.string(),
    lastConnectionAt: v.union(v.number(), v.null()),
    description: v.string(),
    processingStatus,
    activeProcessorDeviceId: v.union(v.string(), v.null()),
    activeProcessingSessionId: v.union(v.string(), v.null()),
    lastProcessedAt: v.union(v.number(), v.null()),
    source: dataSource,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_externalId', ['externalId'])
    .index('by_status', ['status'])
    .index('by_activeProcessorDeviceId', ['activeProcessorDeviceId']),

  monitoringZones: defineTable({
    externalId: v.string(),
    cameraId: v.id('cameras'),
    name: v.string(),
    description: v.string(),
    /** Normalized polygon points, each between 0 and 1. */
    polygon: v.array(normalizedPoint),
    enabled: v.boolean(),
    /** True only for explicitly labeled demonstration zones. */
    demo: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_externalId', ['externalId'])
    .index('by_cameraId', ['cameraId']),

  processorDevices: defineTable({
    deviceId: v.string(),
    name: v.string(),
    status: processorStatus,
    description: v.string(),
    lastSeenAt: v.union(v.number(), v.null()),
    registeredAt: v.number(),
    updatedAt: v.number(),
  }).index('by_deviceId', ['deviceId']),

  processorHeartbeats: defineTable({
    deviceId: v.string(),
    processorDeviceId: v.id('processorDevices'),
    cameraId: v.union(v.id('cameras'), v.null()),
    status: processingStatus,
    processorVersion: v.union(v.string(), v.null()),
    processingSessionId: v.union(v.string(), v.null()),
    fps: v.union(v.number(), v.null()),
    inferenceLatencyMs: v.union(v.number(), v.null()),
    queueDepth: v.union(v.number(), v.null()),
    reportedAt: v.number(),
    receivedAt: v.number(),
  })
    .index('by_deviceId_reportedAt', ['deviceId', 'reportedAt'])
    .index('by_cameraId_reportedAt', ['cameraId', 'reportedAt'])
    .index('by_reportedAt', ['reportedAt']),

  modelVersions: defineTable({
    /** Stable composite key: provider:name:version. */
    key: v.string(),
    provider: modelProvider,
    name: v.string(),
    version: v.string(),
    modelType,
    /** Classes the processor claims the model can emit. Unverified by default. */
    declaredSupportedClasses: v.array(v.string()),
    /**
     * Stays false until an operator records an inspected class list in
     * Phase 8. The processor cannot mark a model as verified.
     */
    classesVerified: v.boolean(),
    verificationNotes: v.union(v.string(), v.null()),
    verifiedAt: v.union(v.number(), v.null()),
    firstReportedAt: v.number(),
    lastReportedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_provider_name_version', ['provider', 'name', 'version']),

  detections: defineTable({
    externalEventId: v.string(),
    cameraId: v.id('cameras'),
    cameraExternalId: v.string(),
    monitoringZoneId: v.union(v.id('monitoringZones'), v.null()),
    processingSessionId: v.string(),
    trackingId: v.number(),
    trackKey: v.string(),
    objectClass: detectionObjectClass,
    confidence: v.number(),
    boundingBox,
    status: detectionStatus,
    modelVersionId: v.union(v.id('modelVersions'), v.null()),
    occurredAt: v.number(),
    receivedAt: v.number(),
    source: dataSource,
    snapshot: v.object({
      cameraName: v.string(),
      location: v.string(),
      building: v.string(),
    }),
  })
    .index('by_externalEventId', ['externalEventId'])
    .index('by_cameraId_occurredAt', ['cameraId', 'occurredAt'])
    .index('by_trackKey', ['trackKey'])
    .index('by_status', ['status']),

  objectTracks: defineTable({
    trackKey: v.string(),
    cameraId: v.id('cameras'),
    cameraExternalId: v.string(),
    processingSessionId: v.string(),
    trackingId: v.number(),
    objectClass: detectionObjectClass,
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    stationarySince: v.union(v.number(), v.null()),
    stationaryDurationSeconds: v.number(),
    lastConfidence: v.number(),
    currentPosition: v.union(boundingBox, v.null()),
    previousPosition: v.union(boundingBox, v.null()),
    state: trackState,
    updateCount: v.number(),
    lastDetectionId: v.union(v.id('detections'), v.null()),
    lastPersonAssociationId: v.union(v.id('personAssociations'), v.null()),
    incidentId: v.union(v.id('incidents'), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_trackKey', ['trackKey'])
    .index('by_cameraId_lastSeenAt', ['cameraId', 'lastSeenAt'])
    .index('by_state', ['state']),

  personAssociations: defineTable({
    trackKey: v.string(),
    objectTrackId: v.union(v.id('objectTracks'), v.null()),
    cameraId: v.id('cameras'),
    processingSessionId: v.string(),
    externalEventId: v.string(),
    associatedPersonObserved: v.boolean(),
    observationWindowSeconds: v.number(),
    associationConfidence: v.union(v.number(), v.null()),
    nearestPersonTrackingId: v.union(v.number(), v.null()),
    distanceNormalized: v.union(v.number(), v.null()),
    overlapRatio: v.union(v.number(), v.null()),
    observations: v.array(
      v.object({
        observedAt: v.number(),
        personTrackingId: v.union(v.number(), v.null()),
        distanceNormalized: v.union(v.number(), v.null()),
        overlapRatio: v.union(v.number(), v.null()),
        confidence: v.union(v.number(), v.null()),
      }),
    ),
    observedAt: v.number(),
    receivedAt: v.number(),
  })
    .index('by_trackKey', ['trackKey'])
    .index('by_cameraId_observedAt', ['cameraId', 'observedAt']),

  incidents: defineTable({
    incidentNumber: v.string(),
    detectionId: v.union(v.id('detections'), v.null()),
    externalDetectionId: v.union(v.string(), v.null()),
    cameraId: v.id('cameras'),
    cameraExternalId: v.string(),
    cameraName: v.string(),
    location: v.string(),
    building: v.string(),
    objectType: incidentObjectType,
    trackingId: v.number(),
    trackKey: v.string(),
    confidence: v.number(),
    unattendedDuration: v.number(),
    priority: incidentPriority,
    status: incidentStatus,
    assignedOfficerId: v.union(v.string(), v.null()),
    assignedOfficerName: v.union(v.string(), v.null()),
    assignedUserId: v.union(v.id('users'), v.null()),
    description: v.string(),
    detectedAt: v.number(),
    acknowledgedAt: v.union(v.number(), v.null()),
    resolvedAt: v.union(v.number(), v.null()),
    resolutionNotes: v.union(v.string(), v.null()),
    evidenceSnapshot: evidenceMetadata,
    source: dataSource,
    /** Prevents repeated alerts for the same active object track. */
    dedupeKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_incidentNumber', ['incidentNumber'])
    .index('by_status_createdAt', ['status', 'createdAt'])
    .index('by_assignedUserId_status', ['assignedUserId', 'status'])
    .index('by_assignedUserId', ['assignedUserId'])
    .index('by_cameraId_createdAt', ['cameraId', 'createdAt'])
    .index('by_trackKey', ['trackKey'])
    .index('by_dedupeKey', ['dedupeKey']),

  incidentEvidence: defineTable({
    incidentId: v.id('incidents'),
    kind: v.union(v.literal('detection_metadata'), v.literal('external_reference')),
    /** Phase 7A stores metadata only. */
    storageProvider: v.literal('none'),
    storageRef: v.union(v.string(), v.null()),
    metadata: evidenceMetadata,
    retentionUntil: v.union(v.number(), v.null()),
    createdAt: v.number(),
  }).index('by_incidentId', ['incidentId']),

  incidentActions: defineTable({
    incidentId: v.id('incidents'),
    type: incidentActionType,
    actorUserId: v.union(v.id('users'), v.null()),
    actorName: v.string(),
    actorRole: v.union(userRole, v.null()),
    description: v.string(),
    noteContent: v.union(v.string(), v.null()),
    createdAt: v.number(),
  }).index('by_incidentId_createdAt', ['incidentId', 'createdAt']),

  activityLogs: defineTable({
    type: activityLogType,
    actorUserId: v.union(v.id('users'), v.null()),
    actorName: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_type_createdAt', ['type', 'createdAt'])
    .index('by_actorUserId', ['actorUserId'])
    .index('by_targetId', ['targetId']),

  ingestionReceipts: defineTable({
    idempotencyKey: v.string(),
    eventId: v.string(),
    eventType,
    deviceId: v.string(),
    /** SHA-256 hex digest of the exact request body. */
    bodyHash: v.string(),
    status: v.union(v.literal('processed'), v.literal('duplicate')),
    resultRef: v.union(v.string(), v.null()),
    detectionId: v.union(v.id('detections'), v.null()),
    incidentId: v.union(v.id('incidents'), v.null()),
    trackKey: v.union(v.string(), v.null()),
    receivedAt: v.number(),
    processedAt: v.number(),
  })
    .index('by_idempotencyKey', ['idempotencyKey'])
    .index('by_eventId', ['eventId'])
    .index('by_deviceId_receivedAt', ['deviceId', 'receivedAt']),

  ingestionNonces: defineTable({
    nonce: v.string(),
    deviceId: v.string(),
    requestTimestamp: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_nonce', ['nonce'])
    .index('by_expiresAt', ['expiresAt']),

  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index('by_name', ['name']),

  /**
   * Kaggle/Roboflow training telemetry. This is intentionally separate from
   * modelVersions, whose records describe models observed by the processor.
   */
  trainingRuns: defineTable({
    project: v.string(),
    version: v.number(),
    modelArch: v.string(),
    epochs: v.number(),
    mAP50: v.optional(v.number()),
    mAP50_95: v.optional(v.number()),
    status: v.union(
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_startedAt', ['startedAt'])
    .index('by_status_startedAt', ['status', 'startedAt']),

  /**
   * Raw Roboflow Workflow webhook telemetry. These records never feed the
   * operational detections/incidents tables without temporal processing and
   * human review.
   */
  roboflowDetections: defineTable({
    label: v.string(),
    confidence: v.number(),
    bbox: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
    ),
    imageUrl: v.optional(v.string()),
    receivedAt: v.number(),
  })
    .index('by_receivedAt', ['receivedAt'])
    .index('by_label_receivedAt', ['label', 'receivedAt']),
})
