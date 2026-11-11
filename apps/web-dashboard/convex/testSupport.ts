import {
  buildCanonicalRequest,
  computeHmacSha256Hex,
  sha256Hex,
} from './lib/hmac'

/** Test-only shared secret. Never used by a real deployment. */
export const TEST_PROCESSOR_SECRET =
  'test-processor-secret-0123456789abcdef'

export const TEST_DEVICE_ID = 'PROCESSOR-DEMO-001'
export const TEST_EVENT_PATH = '/api/ai/events'

let nonceCounter = 0

export function nextNonce(prefix = 'nonce'): string {
  nonceCounter += 1
  return `${prefix}-${Date.now()}-${nonceCounter}`
}

export interface SignedRequestOptions {
  body: unknown
  deviceId?: string
  secret?: string
  timestampSeconds?: number
  nonce?: string
  path?: string
  contentType?: string
  bodyOverride?: string
}

export interface SignedRequest {
  bodyText: string
  headers: Record<string, string>
  deviceId: string
  nonce: string
  timestamp: string
  signature: string
}

export async function signEventRequest(
  options: SignedRequestOptions,
): Promise<SignedRequest> {
  const bodyText =
    options.bodyOverride ?? JSON.stringify(options.body)
  const deviceId = options.deviceId ?? TEST_DEVICE_ID
  const timestamp = String(
    options.timestampSeconds ?? Math.floor(Date.now() / 1000),
  )
  const nonce = options.nonce ?? nextNonce()
  const path = options.path ?? TEST_EVENT_PATH
  const bodyHash = await sha256Hex(bodyText)

  const signature = await computeHmacSha256Hex(
    options.secret ?? TEST_PROCESSOR_SECRET,
    buildCanonicalRequest({
      method: 'POST',
      path,
      deviceId,
      timestamp,
      nonce,
      bodyHash,
    }),
  )

  return {
    bodyText,
    deviceId,
    nonce,
    timestamp,
    signature,
    headers: {
      'content-type': options.contentType ?? 'application/json',
      'x-processor-device-id': deviceId,
      'x-processor-timestamp': timestamp,
      'x-processor-nonce': nonce,
      'x-processor-signature': signature,
    },
  }
}

export function detectionEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: '1.0',
    event_id: 'evt-detection-001',
    event_type: 'detection',
    idempotency_key: 'idem-detection-001-abcdef',
    processor_device_id: TEST_DEVICE_ID,
    occurred_at: new Date().toISOString(),
    camera_id: 'CAM-001',
    processing_session_id: 'session-test-001',
    tracking_id: 11,
    object_class: 'backpack',
    confidence: 0.88,
    bounding_box: { x: 0.2, y: 0.3, width: 0.2, height: 0.25 },
    status: 'stationary',
    ...overrides,
  }
}

export function trackSummaryEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: '1.0',
    event_id: 'evt-track-001',
    event_type: 'track_summary',
    idempotency_key: 'idem-track-001-abcdef',
    processor_device_id: TEST_DEVICE_ID,
    occurred_at: new Date().toISOString(),
    camera_id: 'CAM-001',
    processing_session_id: 'session-test-001',
    tracking_id: 11,
    object_class: 'backpack',
    confidence: 0.9,
    bounding_box: { x: 0.21, y: 0.31, width: 0.2, height: 0.25 },
    stationary_duration_seconds: 140,
    state: 'MONITORING',
    ...overrides,
  }
}

export function potentialIncidentEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: '1.0',
    event_id: 'evt-potential-001',
    event_type: 'potential_unattended_object',
    idempotency_key: 'idem-potential-001-abcdef',
    processor_device_id: TEST_DEVICE_ID,
    occurred_at: new Date().toISOString(),
    camera_id: 'CAM-001',
    processing_session_id: 'session-test-001',
    tracking_id: 11,
    object_class: 'backpack',
    confidence: 0.91,
    stationary_duration_seconds: 135,
    bounding_box: { x: 0.2, y: 0.3, width: 0.2, height: 0.25 },
    person_association: {
      associated_person_observed: false,
      observation_window_seconds: 120,
    },
    model: {
      provider: 'mock',
      name: 'mock-object-detector',
      version: '1',
      model_type: 'mock',
      supported_classes: [
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
      ],
    },
    ...overrides,
  }
}

export function heartbeatEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: '1.0',
    event_id: 'evt-heartbeat-001',
    event_type: 'processor_heartbeat',
    idempotency_key: 'idem-heartbeat-001-abcdef',
    processor_device_id: TEST_DEVICE_ID,
    occurred_at: new Date().toISOString(),
    status: 'processing',
    camera_id: 'CAM-001',
    processing_session_id: 'session-test-001',
    metrics: {
      fps: 12.5,
      inference_latency_ms: 42,
      queue_depth: 0,
    },
    ...overrides,
  }
}

export function modelInformationEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: '1.0',
    event_id: 'evt-model-001',
    event_type: 'model_information',
    idempotency_key: 'idem-model-001-abcdef',
    processor_device_id: TEST_DEVICE_ID,
    occurred_at: new Date().toISOString(),
    model: {
      provider: 'roboflow',
      name: 'campus-object-detector',
      version: '1',
      model_type: 'custom',
      supported_classes: ['person', 'backpack'],
    },
    ...overrides,
  }
}

export function personAssociationEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: '1.0',
    event_id: 'evt-association-001',
    event_type: 'person_association',
    idempotency_key: 'idem-association-001-abcdef',
    processor_device_id: TEST_DEVICE_ID,
    occurred_at: new Date().toISOString(),
    camera_id: 'CAM-001',
    processing_session_id: 'session-test-001',
    tracking_id: 11,
    object_class: 'backpack',
    associated_person_observed: false,
    observation_window_seconds: 90,
    association_confidence: 0.35,
    observations: [
      {
        observed_at: new Date().toISOString(),
        person_tracking_id: 21,
        distance_normalized: 0.42,
        overlap_ratio: 0.05,
        confidence: 0.7,
      },
    ],
    ...overrides,
  }
}
