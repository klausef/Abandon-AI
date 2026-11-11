import { httpRouter } from 'convex/server'
import { ConvexError } from 'convex/values'
import { internal } from './_generated/api'
import { httpAction } from './_generated/server'
import {
  EventValidationError,
  parseEventPayload,
} from './lib/eventValidation'
import {
  buildCanonicalRequest,
  computeHmacSha256Hex,
  sha256Hex,
  timingSafeEqualHex,
} from './lib/hmac'
import { errorResponse, jsonResponse } from './lib/httpResponses'
import { isDeviceAllowed, readProcessorConfig } from './lib/processorConfig'
import {
  parseRoboflowPredictions,
  readRoboflowWebhookSecret,
  verifyRoboflowWebhookSecret,
} from './lib/roboflowWebhook'

const http = httpRouter()

const EVENT_PATH = '/api/ai/events'
const DEVICE_HEADER = 'x-processor-device-id'
const TIMESTAMP_HEADER = 'x-processor-timestamp'
const NONCE_HEADER = 'x-processor-nonce'
const SIGNATURE_HEADER = 'x-processor-signature'
const SIGNATURE_VERSION_HEADER = 'x-processor-signature-version'

const ROBOFLOW_WEBHOOK_PATH = '/roboflow-webhook'
const ROBOFLOW_SECRET_HEADER = 'x-webhook-secret'
const ROBOFLOW_MAX_REQUEST_BYTES = 1_000_000
const ROBOFLOW_MAX_PREDICTIONS = 200

const DEVICE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const NONCE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
const TIMESTAMP_PATTERN = /^\d{1,12}$/
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/

interface IngestErrorData {
  code?: unknown
  status?: unknown
  message?: unknown
  issues?: unknown
}

function toIngestErrorData(error: unknown): IngestErrorData | null {
  if (!(error instanceof ConvexError)) {
    return null
  }
  const raw = error.data
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof data !== 'object' || data === null) {
    return null
  }
  return data as IngestErrorData
}

http.route({
  path: '/api/ai/health',
  method: 'GET',
  handler: httpAction(async () =>
    jsonResponse(200, {
      ok: true,
      service: 'campus-safety-convex-ingestion',
      schema_version: '1.0',
    }),
  ),
})

/**
 * Authenticated processor event ingestion.
 *
 * The processor signs the exact request body with HMAC-SHA256. No Convex
 * deployment key is ever shipped to the processor; the shared secret lives
 * only in the Convex deployment environment.
 */
http.route({
  path: EVENT_PATH,
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const config = readProcessorConfig()
    if (!config) {
      return errorResponse(
        503,
        'INGESTION_NOT_CONFIGURED',
        'Processor ingestion is not configured on this deployment.',
      )
    }

    const contentType = (request.headers.get('content-type') ?? '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase()
    if (contentType !== 'application/json') {
      return errorResponse(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.',
      )
    }

    const rawBody = await request.text()
    const bodyBytes = new TextEncoder().encode(rawBody).byteLength

    if (bodyBytes === 0) {
      return errorResponse(400, 'EMPTY_BODY', 'Request body is required.')
    }
    if (bodyBytes > config.maxRequestBytes) {
      return errorResponse(
        413,
        'PAYLOAD_TOO_LARGE',
        `Request body must not exceed ${config.maxRequestBytes} bytes.`,
      )
    }

    const deviceId = (request.headers.get(DEVICE_HEADER) ?? '').trim()
    const timestampHeader = (
      request.headers.get(TIMESTAMP_HEADER) ?? ''
    ).trim()
    const nonce = (request.headers.get(NONCE_HEADER) ?? '').trim()
    const signature = (request.headers.get(SIGNATURE_HEADER) ?? '')
      .trim()
      .toLowerCase()
    const signatureVersion = (
      request.headers.get(SIGNATURE_VERSION_HEADER) ?? 'v1'
    )
      .trim()
      .toLowerCase()

    if (!deviceId || !timestampHeader || !nonce || !signature) {
      return errorResponse(
        401,
        'MISSING_AUTHENTICATION',
        'Processor authentication headers are required.',
      )
    }

    if (
      !DEVICE_PATTERN.test(deviceId) ||
      !TIMESTAMP_PATTERN.test(timestampHeader) ||
      !NONCE_PATTERN.test(nonce) ||
      !SIGNATURE_PATTERN.test(signature)
    ) {
      return errorResponse(
        401,
        'INVALID_AUTHENTICATION',
        'Processor authentication headers are malformed.',
      )
    }

    if (signatureVersion !== 'v1') {
      return errorResponse(
        401,
        'UNSUPPORTED_SIGNATURE_VERSION',
        'Only signature version v1 is supported.',
      )
    }

    if (!isDeviceAllowed(config, deviceId)) {
      return errorResponse(
        403,
        'DEVICE_NOT_ALLOWED',
        'This processor device is not allowed.',
      )
    }

    const requestTimestampMs = Number.parseInt(timestampHeader, 10) * 1000
    const now = Date.now()
    const clockSkewMs = config.maxClockSkewSeconds * 1000

    if (
      !Number.isFinite(requestTimestampMs) ||
      Math.abs(now - requestTimestampMs) > clockSkewMs
    ) {
      return errorResponse(
        401,
        'STALE_REQUEST',
        'The request timestamp is outside the allowed clock skew window.',
      )
    }

    const bodyHash = await sha256Hex(rawBody)
    const expectedSignature = await computeHmacSha256Hex(
      config.sharedSecret,
      buildCanonicalRequest({
        method: 'POST',
        path: EVENT_PATH,
        deviceId,
        timestamp: timestampHeader,
        nonce,
        bodyHash,
      }),
    )

    if (!timingSafeEqualHex(expectedSignature, signature)) {
      return errorResponse(
        401,
        'INVALID_SIGNATURE',
        'Request signature verification failed.',
      )
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return errorResponse(
        400,
        'INVALID_JSON',
        'Request body must be valid JSON.',
      )
    }

    let event
    try {
      event = parseEventPayload(payload)
    } catch (error) {
      if (error instanceof EventValidationError) {
        return errorResponse(
          422,
          'INVALID_EVENT',
          'The event payload failed validation.',
          error.issues,
        )
      }
      return errorResponse(
        422,
        'INVALID_EVENT',
        'The event payload could not be processed.',
      )
    }

    if (event.deviceId !== deviceId) {
      return errorResponse(
        401,
        'DEVICE_MISMATCH',
        'The signed device does not match the payload device.',
      )
    }

    try {
      const result = await ctx.runMutation(internal.ingestion.ingest, {
        payload,
        deviceId,
        bodyHash,
        nonce,
        requestTimestamp: requestTimestampMs,
        // A request timestamp may be as much as one skew window in the
        // future, so retain its nonce until that timestamp plus one complete
        // skew window can no longer authenticate.
        nonceExpiresAt: requestTimestampMs + clockSkewMs + 1_000,
        receivedAt: now,
      })
      return jsonResponse(result.status, result.body)
    } catch (error) {
      const data = toIngestErrorData(error)
      if (
        data &&
        typeof data.code === 'string' &&
        typeof data.status === 'number' &&
        typeof data.message === 'string'
      ) {
        return errorResponse(
          data.status,
          data.code,
          data.message,
          Array.isArray(data.issues)
            ? data.issues.filter(
                (issue): issue is string => typeof issue === 'string',
              )
            : undefined,
        )
      }

      console.error('Processor ingestion failed unexpectedly.')
      return errorResponse(
        500,
        'INTERNAL_ERROR',
        'The event could not be processed.',
      )
    }
  }),
})

/**
 * Metadata-only Roboflow Workflow ingestion.
 *
 * These records are isolated from operational detections and incidents. A
 * Workflow prediction cannot directly create a security incident or bypass
 * the existing temporal-evidence and human-review controls.
 */
http.route({
  path: ROBOFLOW_WEBHOOK_PATH,
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const configuredSecret = readRoboflowWebhookSecret()
    if (!configuredSecret) {
      return errorResponse(
        503,
        'WEBHOOK_NOT_CONFIGURED',
        'Roboflow webhook ingestion is not configured on this deployment.',
      )
    }

    const providedSecret = (
      request.headers.get(ROBOFLOW_SECRET_HEADER) ?? ''
    ).trim()
    if (
      !providedSecret ||
      !(await verifyRoboflowWebhookSecret(
        configuredSecret,
        providedSecret,
      ))
    ) {
      return errorResponse(
        401,
        'INVALID_WEBHOOK_SECRET',
        'Roboflow webhook authentication failed.',
      )
    }

    const contentType = (request.headers.get('content-type') ?? '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase()
    if (contentType !== 'application/json') {
      return errorResponse(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.',
      )
    }

    const rawBody = await request.text()
    const bodyBytes = new TextEncoder().encode(rawBody).byteLength
    if (bodyBytes === 0) {
      return errorResponse(400, 'EMPTY_BODY', 'Request body is required.')
    }
    if (bodyBytes > ROBOFLOW_MAX_REQUEST_BYTES) {
      return errorResponse(
        413,
        'PAYLOAD_TOO_LARGE',
        `Request body must not exceed ${ROBOFLOW_MAX_REQUEST_BYTES} bytes.`,
      )
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return errorResponse(
        400,
        'INVALID_JSON',
        'Request body must be valid JSON.',
      )
    }

    const predictions = parseRoboflowPredictions(payload)
    if (predictions.length > ROBOFLOW_MAX_PREDICTIONS) {
      return errorResponse(
        422,
        'TOO_MANY_PREDICTIONS',
        `A webhook may contain at most ${ROBOFLOW_MAX_PREDICTIONS} valid predictions.`,
      )
    }

    const receivedAt = Date.now()
    try {
      for (const prediction of predictions) {
        await ctx.runMutation(internal.runs.saveDetection, {
          label: prediction.label,
          confidence: prediction.confidence,
          receivedAt,
          ...(prediction.bbox ? { bbox: prediction.bbox } : {}),
          ...(prediction.imageUrl ? { imageUrl: prediction.imageUrl } : {}),
        })
      }
    } catch {
      console.error('Roboflow webhook ingestion failed unexpectedly.')
      return errorResponse(
        500,
        'INTERNAL_ERROR',
        'Roboflow predictions could not be saved.',
      )
    }

    return jsonResponse(200, {
      ok: true,
      saved: predictions.length,
    })
  }),
})

export default http
