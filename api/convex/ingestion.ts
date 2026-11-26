import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, type MutationCtx } from './_generated/server'
import { recordActivity, recordIncidentAction } from './lib/audit'
import { nextCounterValue } from './lib/counters'
import {
  EventValidationError,
  parseEventPayload,
  type NormalizedBoundingBox,
  type NormalizedEvent,
  type NormalizedModel,
  type NormalizedPersonAssociation,
  type TrackState,
} from './lib/eventValidation'
import { demoPriorityForConfidence, formatIncidentNumber } from './lib/incidents'
import { buildModelKey, buildTrackKey } from './lib/keys'

type IngestErrorData = {
  code: string
  status: number
  message: string
  issues?: string[]
}

function ingestError(
  status: number,
  code: string,
  message: string,
  issues?: readonly string[],
): ConvexError<IngestErrorData> {
  const data: IngestErrorData = issues
    ? { code, status, message, issues: [...issues] }
    : { code, status, message }
  return new ConvexError(data)
}

const NONCE_PRUNE_BATCH = 25

function readableObjectClass(value: string): string {
  return value.replaceAll('_', ' ')
}

function requireCamera(camera: Doc<'cameras'> | null): Doc<'cameras'> {
  if (!camera) {
    throw ingestError(
      422,
      'CAMERA_REQUIRED',
      'This event type requires a valid camera reference.',
    )
  }
  return camera
}

async function findCamera(
  ctx: MutationCtx,
  externalId: string,
): Promise<Doc<'cameras'> | null> {
  return await ctx.db
    .query('cameras')
    .withIndex('by_externalId', (query) => query.eq('externalId', externalId))
    .unique()
}

async function resolveModelVersionId(
  ctx: MutationCtx,
  model: NormalizedModel | null,
  now: number,
): Promise<Id<'modelVersions'> | null> {
  if (!model) {
    return null
  }

  const key = buildModelKey(model.provider, model.name, model.version)
  const existing = await ctx.db
    .query('modelVersions')
    .withIndex('by_key', (query) => query.eq('key', key))
    .unique()

  if (existing) {
    await ctx.db.patch(
      existing._id,
      existing.classesVerified || model.declaredSupportedClasses.length === 0
        ? { lastReportedAt: now }
        : {
            lastReportedAt: now,
            declaredSupportedClasses: [...model.declaredSupportedClasses],
          },
    )
    return existing._id
  }

  const modelVersionId = await ctx.db.insert('modelVersions', {
    key,
    provider: model.provider,
    name: model.name,
    version: model.version,
    modelType: model.modelType,
    declaredSupportedClasses: [...model.declaredSupportedClasses],
    classesVerified: false,
    verificationNotes: null,
    verifiedAt: null,
    firstReportedAt: now,
    lastReportedAt: now,
  })

  await recordActivity(ctx, {
    type: 'model_registered',
    targetType: 'modelVersion',
    targetId: modelVersionId,
    description: `Processor reported model ${model.provider}/${model.name}@${model.version}. Class support is unverified.`,
    createdAt: now,
  })

  return modelVersionId
}

interface TrackUpdate {
  trackKey: string
  camera: Doc<'cameras'>
  sessionId: string
  trackingId: number
  objectClass: Doc<'objectTracks'>['objectClass']
  confidence: number
  occurredAt: number
  now: number
  boundingBox?: NormalizedBoundingBox | null
  previousBoundingBox?: NormalizedBoundingBox | null
  firstSeenAt?: number | null
  lastSeenAt?: number | null
  stationarySince?: number | null
  stationaryDurationSeconds?: number
  state?: TrackState
  detectionId?: Id<'detections'> | null
}

async function upsertObjectTrack(
  ctx: MutationCtx,
  update: TrackUpdate,
): Promise<Doc<'objectTracks'>> {
  const existing = await ctx.db
    .query('objectTracks')
    .withIndex('by_trackKey', (query) =>
      query.eq('trackKey', update.trackKey),
    )
    .unique()

  const boundingBox = update.boundingBox ?? null
  const lastSeenAt = update.lastSeenAt ?? update.occurredAt

  if (existing) {
    await ctx.db.patch(existing._id, {
      firstSeenAt: Math.min(
        existing.firstSeenAt,
        update.firstSeenAt ?? update.occurredAt,
      ),
      lastSeenAt: Math.max(existing.lastSeenAt, lastSeenAt),
      lastConfidence: update.confidence,
      previousPosition:
        update.previousBoundingBox ??
        (boundingBox ? existing.currentPosition : existing.previousPosition),
      currentPosition: boundingBox ?? existing.currentPosition,
      stationarySince: update.stationarySince ?? existing.stationarySince,
      stationaryDurationSeconds: Math.max(
        existing.stationaryDurationSeconds,
        update.stationaryDurationSeconds ??
          existing.stationaryDurationSeconds,
      ),
      state: update.state ?? existing.state,
      updateCount: existing.updateCount + 1,
      lastDetectionId: update.detectionId ?? existing.lastDetectionId,
      updatedAt: update.now,
    })
    return (await ctx.db.get(existing._id)) as Doc<'objectTracks'>
  }

  const trackId = await ctx.db.insert('objectTracks', {
    trackKey: update.trackKey,
    cameraId: update.camera._id,
    cameraExternalId: update.camera.externalId,
    processingSessionId: update.sessionId,
    trackingId: update.trackingId,
    objectClass: update.objectClass,
    firstSeenAt: update.firstSeenAt ?? update.occurredAt,
    lastSeenAt,
    stationarySince: update.stationarySince ?? null,
    stationaryDurationSeconds: update.stationaryDurationSeconds ?? 0,
    lastConfidence: update.confidence,
    currentPosition: boundingBox,
    previousPosition: update.previousBoundingBox ?? null,
    state: update.state ?? 'OBSERVED',
    updateCount: 1,
    lastDetectionId: update.detectionId ?? null,
    lastPersonAssociationId: null,
    incidentId: null,
    createdAt: update.now,
    updatedAt: update.now,
  })

  return (await ctx.db.get(trackId)) as Doc<'objectTracks'>
}

async function insertPersonAssociation(
  ctx: MutationCtx,
  params: {
    track: Doc<'objectTracks'>
    eventId: string
    association: NormalizedPersonAssociation
    observedAt: number
    receivedAt: number
  },
): Promise<Id<'personAssociations'>> {
  return await ctx.db.insert('personAssociations', {
    trackKey: params.track.trackKey,
    objectTrackId: params.track._id,
    cameraId: params.track.cameraId,
    processingSessionId: params.track.processingSessionId,
    externalEventId: params.eventId,
    associatedPersonObserved:
      params.association.associatedPersonObserved,
    observationWindowSeconds:
      params.association.observationWindowSeconds,
    associationConfidence: params.association.associationConfidence,
    nearestPersonTrackingId:
      params.association.nearestPersonTrackingId,
    distanceNormalized: params.association.distanceNormalized,
    overlapRatio: params.association.overlapRatio,
    observations: params.association.observations.map((observation) => ({
      observedAt: observation.observedAt,
      personTrackingId: observation.personTrackingId,
      distanceNormalized: observation.distanceNormalized,
      overlapRatio: observation.overlapRatio,
      confidence: observation.confidence,
    })),
    observedAt: params.observedAt,
    receivedAt: params.receivedAt,
  })
}

async function findActiveIncidentForTrack(
  ctx: MutationCtx,
  trackKey: string,
): Promise<Doc<'incidents'> | null> {
  const incidents = await ctx.db
    .query('incidents')
    .withIndex('by_trackKey', (query) => query.eq('trackKey', trackKey))
    .collect()

  return (
    incidents.find(
      (incident) =>
        incident.status === 'new' ||
        incident.status === 'acknowledged' ||
        incident.status === 'investigating',
    ) ?? null
  )
}

/**
 * Single transactional ingestion handler.
 *
 * The HTTP action authenticates the request before calling this mutation.
 * The mutation re-validates the payload (defense in depth), enforces device
 * registration and revocation, applies nonce/idempotency protection, and
 * writes every related record atomically.
 */
export const ingest = internalMutation({
  args: {
    payload: v.any(),
    deviceId: v.string(),
    bodyHash: v.string(),
    nonce: v.string(),
    requestTimestamp: v.number(),
    nonceExpiresAt: v.number(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    let event: NormalizedEvent
    try {
      event = parseEventPayload(args.payload)
    } catch (error) {
      if (error instanceof EventValidationError) {
        throw ingestError(
          422,
          'INVALID_EVENT',
          'The event payload failed validation.',
          error.issues,
        )
      }
      throw error
    }

    if (event.deviceId !== args.deviceId) {
      throw ingestError(
        401,
        'DEVICE_MISMATCH',
        'The signed device does not match the payload device.',
      )
    }

    const device = await ctx.db
      .query('processorDevices')
      .withIndex('by_deviceId', (query) =>
        query.eq('deviceId', args.deviceId),
      )
      .unique()

    if (!device) {
      throw ingestError(
        403,
        'DEVICE_NOT_REGISTERED',
        'This processor device is not registered.',
      )
    }
    if (device.status !== 'active') {
      throw ingestError(
        403,
        'DEVICE_REVOKED',
        'This processor device has been revoked.',
      )
    }

    const usedNonce = await ctx.db
      .query('ingestionNonces')
      .withIndex('by_nonce', (query) => query.eq('nonce', args.nonce))
      .unique()

    if (usedNonce) {
      throw ingestError(
        401,
        'NONCE_REPLAY',
        'This request nonce has already been used.',
      )
    }

    await ctx.db.insert('ingestionNonces', {
      nonce: args.nonce,
      deviceId: args.deviceId,
      requestTimestamp: args.requestTimestamp,
      expiresAt: Math.max(args.nonceExpiresAt, args.receivedAt + 1_000),
      createdAt: args.receivedAt,
    })

    const expiredNonces = await ctx.db
      .query('ingestionNonces')
      .withIndex('by_expiresAt', (query) =>
        query.lt('expiresAt', args.receivedAt),
      )
      .take(NONCE_PRUNE_BATCH)

    for (const expiredNonce of expiredNonces) {
      await ctx.db.delete(expiredNonce._id)
    }

    const previousReceipt = await ctx.db
      .query('ingestionReceipts')
      .withIndex('by_idempotencyKey', (query) =>
        query.eq('idempotencyKey', event.idempotencyKey),
      )
      .unique()

    if (previousReceipt) {
      if (
        previousReceipt.deviceId !== args.deviceId ||
        previousReceipt.eventId !== event.eventId ||
        previousReceipt.bodyHash !== args.bodyHash
      ) {
        throw ingestError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used with different content.',
        )
      }

      const priorIncident = previousReceipt.incidentId
        ? await ctx.db.get(previousReceipt.incidentId)
        : null

      return {
        status: 200,
        body: {
          ok: true,
          status: 'duplicate',
          event_id: previousReceipt.eventId,
          event_type: previousReceipt.eventType,
          receipt_id: previousReceipt._id,
          detection_id: previousReceipt.detectionId,
          incident_id: previousReceipt.incidentId,
          incident_number: priorIncident?.incidentNumber ?? null,
          track_key: previousReceipt.trackKey,
        },
      }
    }

    let camera: Doc<'cameras'> | null = null
    if (event.cameraExternalId) {
      camera = await findCamera(ctx, event.cameraExternalId)
      if (!camera) {
        throw ingestError(
          404,
          'CAMERA_NOT_FOUND',
          `Camera ${event.cameraExternalId} is not registered.`,
        )
      }
    }

    const requiresMonitoring =
      event.eventType === 'detection' ||
      event.eventType === 'track_summary' ||
      event.eventType === 'person_association' ||
      event.eventType === 'potential_unattended_object'

    if (requiresMonitoring) {
      const monitoredCamera = requireCamera(camera)
      if (!monitoredCamera.monitoringEnabled) {
        throw ingestError(
          409,
          'CAMERA_MONITORING_DISABLED',
          `Monitoring is disabled for camera ${monitoredCamera.externalId}.`,
        )
      }
    }

    const zoneExternalId =
      event.eventType === 'detection' ||
      event.eventType === 'track_summary' ||
      event.eventType === 'potential_unattended_object'
        ? event.zoneExternalId
        : null

    let zone: Doc<'monitoringZones'> | null = null
    if (zoneExternalId) {
      zone = await ctx.db
        .query('monitoringZones')
        .withIndex('by_externalId', (query) =>
          query.eq('externalId', zoneExternalId),
        )
        .unique()

      if (!zone) {
        throw ingestError(
          404,
          'ZONE_NOT_FOUND',
          `Monitoring zone ${zoneExternalId} is not registered.`,
        )
      }
      if (!camera || zone.cameraId !== camera._id) {
        throw ingestError(
          422,
          'ZONE_CAMERA_MISMATCH',
          `Monitoring zone ${zoneExternalId} does not belong to camera ${event.cameraExternalId}.`,
        )
      }
      if (!zone.enabled) {
        throw ingestError(
          422,
          'ZONE_DISABLED',
          `Monitoring zone ${zoneExternalId} is disabled.`,
        )
      }
    }

    await ctx.db.patch(device._id, {
      lastSeenAt: args.receivedAt,
      updatedAt: args.receivedAt,
    })

    let resultRef: string | null = null
    let detectionId: Id<'detections'> | null = null
    let incidentId: Id<'incidents'> | null = null
    let incidentNumber: string | null = null
    let incidentCreated = false
    let trackKey: string | null = null

    switch (event.eventType) {
      case 'processor_heartbeat': {
        const heartbeatId = await ctx.db.insert('processorHeartbeats', {
          deviceId: event.deviceId,
          processorDeviceId: device._id,
          cameraId: camera?._id ?? null,
          status: event.status,
          processorVersion: event.processorVersion,
          processingSessionId: event.sessionId,
          fps: event.fps,
          inferenceLatencyMs: event.inferenceLatencyMs,
          queueDepth: event.queueDepth,
          reportedAt: event.occurredAt,
          receivedAt: args.receivedAt,
        })

        if (camera) {
          await ctx.db.patch(camera._id, {
            lastProcessedAt: args.receivedAt,
            updatedAt: args.receivedAt,
          })
        }

        resultRef = heartbeatId
        break
      }

      case 'model_information': {
        resultRef = await resolveModelVersionId(
          ctx,
          event.model,
          args.receivedAt,
        )
        break
      }

      case 'camera_processing_status': {
        const statusCamera = requireCamera(camera)
        const isProcessing = event.status === 'processing'

        await ctx.db.patch(statusCamera._id, {
          processingStatus: event.status,
          activeProcessorDeviceId: isProcessing ? event.deviceId : null,
          activeProcessingSessionId: isProcessing
            ? event.sessionId
            : null,
          lastProcessedAt: args.receivedAt,
          updatedAt: args.receivedAt,
        })

        await recordActivity(ctx, {
          type: 'camera_processing_status_changed',
          targetType: 'camera',
          targetId: statusCamera.externalId,
          description: `Camera ${statusCamera.externalId} processing status changed to ${event.status}.`,
          createdAt: args.receivedAt,
        })

        resultRef = statusCamera.externalId
        break
      }

      case 'detection': {
        const detectionCamera = requireCamera(camera)
        const modelVersionId = await resolveModelVersionId(
          ctx,
          event.model,
          args.receivedAt,
        )
        trackKey = buildTrackKey(
          detectionCamera.externalId,
          event.sessionId,
          event.trackingId,
        )

        detectionId = await ctx.db.insert('detections', {
          externalEventId: event.eventId,
          cameraId: detectionCamera._id,
          cameraExternalId: detectionCamera.externalId,
          monitoringZoneId: zone?._id ?? null,
          processingSessionId: event.sessionId,
          trackingId: event.trackingId,
          trackKey,
          objectClass: event.objectClass,
          confidence: event.confidence,
          boundingBox: event.boundingBox,
          status: event.status,
          modelVersionId,
          occurredAt: event.occurredAt,
          receivedAt: args.receivedAt,
          source: 'PROCESSOR',
          snapshot: {
            cameraName: detectionCamera.name,
            location: detectionCamera.location,
            building: detectionCamera.building,
          },
        })

        await upsertObjectTrack(ctx, {
          trackKey,
          camera: detectionCamera,
          sessionId: event.sessionId,
          trackingId: event.trackingId,
          objectClass: event.objectClass,
          confidence: event.confidence,
          occurredAt: event.occurredAt,
          now: args.receivedAt,
          boundingBox: event.boundingBox,
          detectionId,
        })

        await ctx.db.patch(detectionCamera._id, {
          processingStatus: 'processing',
          activeProcessorDeviceId: event.deviceId,
          activeProcessingSessionId: event.sessionId,
          lastProcessedAt: args.receivedAt,
          updatedAt: args.receivedAt,
        })

        await recordActivity(ctx, {
          type: 'detection_recorded',
          targetType: 'detection',
          targetId: detectionId,
          description: `${readableObjectClass(event.objectClass)} detected on camera ${detectionCamera.externalId}.`,
          createdAt: args.receivedAt,
        })

        resultRef = detectionId
        break
      }

      case 'track_summary': {
        const trackCamera = requireCamera(camera)
        trackKey = buildTrackKey(
          trackCamera.externalId,
          event.sessionId,
          event.trackingId,
        )

        const track = await upsertObjectTrack(ctx, {
          trackKey,
          camera: trackCamera,
          sessionId: event.sessionId,
          trackingId: event.trackingId,
          objectClass: event.objectClass,
          confidence: event.confidence,
          occurredAt: event.occurredAt,
          now: args.receivedAt,
          boundingBox: event.boundingBox,
          previousBoundingBox: event.previousBoundingBox,
          firstSeenAt: event.firstSeenAt,
          lastSeenAt: event.lastSeenAt,
          stationarySince: event.stationarySince,
          stationaryDurationSeconds:
            event.stationaryDurationSeconds,
          state: event.state,
        })

        await resolveModelVersionId(ctx, event.model, args.receivedAt)

        await recordActivity(ctx, {
          type: 'track_updated',
          targetType: 'objectTrack',
          targetId: track.trackKey,
          description: `Track ${track.trackKey} updated to ${track.state}.`,
          createdAt: args.receivedAt,
        })

        resultRef = track.trackKey
        break
      }

      case 'person_association': {
        const associationCamera = requireCamera(camera)
        const associationTrackKey = buildTrackKey(
          associationCamera.externalId,
          event.sessionId,
          event.trackingId,
        )
        trackKey = associationTrackKey

        const track = await ctx.db
          .query('objectTracks')
          .withIndex('by_trackKey', (query) =>
            query.eq('trackKey', associationTrackKey),
          )
          .unique()

        if (!track) {
          throw ingestError(
            422,
            'TRACK_NOT_FOUND',
            `Track ${associationTrackKey} must be recorded before a person association.`,
          )
        }
        if (track.objectClass !== event.objectClass) {
          throw ingestError(
            422,
            'TRACK_CLASS_MISMATCH',
            `Track ${associationTrackKey} is recorded as ${track.objectClass}, not ${event.objectClass}.`,
          )
        }

        const associationId = await insertPersonAssociation(ctx, {
          track,
          eventId: event.eventId,
          association: event.personAssociation,
          observedAt: event.occurredAt,
          receivedAt: args.receivedAt,
        })

        await ctx.db.patch(track._id, {
          lastPersonAssociationId: associationId,
          updatedAt: args.receivedAt,
        })

        await recordActivity(ctx, {
          type: 'person_association_recorded',
          targetType: 'objectTrack',
          targetId: track.trackKey,
          description: `Person association recorded for track ${track.trackKey}.`,
          createdAt: args.receivedAt,
        })

        resultRef = track.trackKey
        break
      }

      case 'potential_unattended_object': {
        const incidentCamera = requireCamera(camera)
        const incidentTrackKey = buildTrackKey(
          incidentCamera.externalId,
          event.sessionId,
          event.trackingId,
        )
        trackKey = incidentTrackKey

        const modelVersionId = await resolveModelVersionId(
          ctx,
          event.model,
          args.receivedAt,
        )

        const existingTrack = await ctx.db
          .query('objectTracks')
          .withIndex('by_trackKey', (query) =>
            query.eq('trackKey', incidentTrackKey),
          )
          .unique()

        if (
          existingTrack &&
          existingTrack.objectClass !== event.objectClass
        ) {
          throw ingestError(
            422,
            'TRACK_CLASS_MISMATCH',
            `Track ${incidentTrackKey} is recorded as ${existingTrack.objectClass}, not ${event.objectClass}.`,
          )
        }

        const evidenceBoundingBox =
          event.boundingBox ?? existingTrack?.currentPosition ?? null

        if (event.boundingBox) {
          detectionId = await ctx.db.insert('detections', {
            externalEventId: event.eventId,
            cameraId: incidentCamera._id,
            cameraExternalId: incidentCamera.externalId,
            monitoringZoneId: zone?._id ?? null,
            processingSessionId: event.sessionId,
            trackingId: event.trackingId,
            trackKey: incidentTrackKey,
            objectClass: event.objectClass,
            confidence: event.confidence,
            boundingBox: event.boundingBox,
            status: 'potential_incident',
            modelVersionId,
            occurredAt: event.occurredAt,
            receivedAt: args.receivedAt,
            source: 'PROCESSOR',
            snapshot: {
              cameraName: incidentCamera.name,
              location: incidentCamera.location,
              building: incidentCamera.building,
            },
          })
        }

        const evidenceDetectionId =
          detectionId ?? existingTrack?.lastDetectionId ?? null

        const track = await upsertObjectTrack(ctx, {
          trackKey: incidentTrackKey,
          camera: incidentCamera,
          sessionId: event.sessionId,
          trackingId: event.trackingId,
          objectClass: event.objectClass,
          confidence: event.confidence,
          occurredAt: event.occurredAt,
          now: args.receivedAt,
          boundingBox: event.boundingBox,
          stationaryDurationSeconds:
            event.stationaryDurationSeconds,
          state: 'POTENTIAL_UNATTENDED',
          detectionId,
        })

        if (event.personAssociation) {
          const associationId = await insertPersonAssociation(ctx, {
            track,
            eventId: event.eventId,
            association: event.personAssociation,
            observedAt: event.occurredAt,
            receivedAt: args.receivedAt,
          })

          await ctx.db.patch(track._id, {
            lastPersonAssociationId: associationId,
            updatedAt: args.receivedAt,
          })
        }

        const dedupeKey = `track:${incidentTrackKey}`
        const activeIncident = await findActiveIncidentForTrack(
          ctx,
          incidentTrackKey,
        )

        if (activeIncident) {
          incidentId = activeIncident._id
          incidentNumber = activeIncident.incidentNumber

          await recordActivity(ctx, {
            type: 'duplicate_alert_suppressed',
            targetType: 'incident',
            targetId: activeIncident.incidentNumber,
            description: `Repeated alert for track ${incidentTrackKey} suppressed; incident ${activeIncident.incidentNumber} is already active.`,
            createdAt: args.receivedAt,
          })
        } else {
          const sequence = await nextCounterValue(ctx, 'incident')
          const year = new Date(event.occurredAt).getUTCFullYear()
          incidentNumber = formatIncidentNumber(year, sequence)

          incidentId = await ctx.db.insert('incidents', {
            incidentNumber,
            detectionId: evidenceDetectionId,
            externalDetectionId: event.eventId,
            cameraId: incidentCamera._id,
            cameraExternalId: incidentCamera.externalId,
            cameraName: incidentCamera.name,
            location: incidentCamera.location,
            building: incidentCamera.building,
            objectType: event.objectClass,
            trackingId: event.trackingId,
            trackKey: incidentTrackKey,
            confidence: event.confidence,
            unattendedDuration: event.stationaryDurationSeconds,
            priority: demoPriorityForConfidence(event.confidence),
            status: 'new',
            assignedOfficerId: null,
            assignedOfficerName: null,
            assignedUserId: null,
            description: `Potential unattended ${readableObjectClass(event.objectClass)} reported on ${incidentCamera.name}. Human verification is required.`,
            detectedAt: event.occurredAt,
            acknowledgedAt: null,
            resolvedAt: null,
            resolutionNotes: null,
            evidenceSnapshot: {
              detectionId: evidenceDetectionId,
              externalDetectionId: event.eventId,
              cameraId: incidentCamera._id,
              cameraExternalId: incidentCamera.externalId,
              cameraName: incidentCamera.name,
              location: incidentCamera.location,
              building: incidentCamera.building,
              objectClass: event.objectClass,
              trackingId: event.trackingId,
              confidence: event.confidence,
              timestamp: event.occurredAt,
              boundingBox: evidenceBoundingBox,
              detectionStatus: 'potential_incident',
            },
            source: 'PROCESSOR',
            dedupeKey,
            createdAt: args.receivedAt,
            updatedAt: args.receivedAt,
          })

          await ctx.db.insert('incidentEvidence', {
            incidentId,
            kind: 'detection_metadata',
            storageProvider: 'none',
            storageRef: null,
            metadata: {
              detectionId: evidenceDetectionId,
              externalDetectionId: event.eventId,
              cameraId: incidentCamera._id,
              cameraExternalId: incidentCamera.externalId,
              cameraName: incidentCamera.name,
              location: incidentCamera.location,
              building: incidentCamera.building,
              objectClass: event.objectClass,
              trackingId: event.trackingId,
              confidence: event.confidence,
              timestamp: event.occurredAt,
              boundingBox: evidenceBoundingBox,
              detectionStatus: 'potential_incident',
            },
            retentionUntil: null,
            createdAt: args.receivedAt,
          })

          await recordIncidentAction(ctx, {
            incidentId,
            type: 'detected',
            description: `${readableObjectClass(event.objectClass)} observed on ${incidentCamera.name} and stationary for ${event.stationaryDurationSeconds} seconds.`,
            createdAt: event.occurredAt,
          })
          await recordIncidentAction(ctx, {
            incidentId,
            type: 'created',
            description:
              'Potential unattended object recorded for human verification.',
            createdAt: args.receivedAt,
          })

          await recordActivity(ctx, {
            type: 'incident_created',
            targetType: 'incident',
            targetId: incidentNumber,
            description: `Potential incident ${incidentNumber} created for human verification.`,
            createdAt: args.receivedAt,
          })

          incidentCreated = true
        }

        await ctx.db.patch(track._id, {
          incidentId,
          state: 'ALERTED',
          updatedAt: args.receivedAt,
        })

        resultRef = incidentNumber
        break
      }
    }

    const receiptId = await ctx.db.insert('ingestionReceipts', {
      idempotencyKey: event.idempotencyKey,
      eventId: event.eventId,
      eventType: event.eventType,
      deviceId: args.deviceId,
      bodyHash: args.bodyHash,
      status: 'processed',
      resultRef,
      detectionId,
      incidentId,
      trackKey,
      receivedAt: args.receivedAt,
      processedAt: args.receivedAt,
    })

    return {
      status: 201,
      body: {
        ok: true,
        status: 'accepted',
        event_id: event.eventId,
        event_type: event.eventType,
        receipt_id: receiptId,
        result_ref: resultRef,
        detection_id: detectionId,
        incident_id: incidentId,
        incident_number: incidentNumber,
        incident_created: incidentCreated,
        track_key: trackKey,
      },
    }
  },
})
