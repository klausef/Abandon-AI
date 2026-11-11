import { sha256Hex, timingSafeEqualHex } from './hmac'

interface JsonObject {
  [key: string]: unknown
}

interface ImageDimensions {
  width: number
  height: number
}

interface RawBox {
  x: number
  y: number
  width: number
  height: number
  coordinates: 'center' | 'top-left'
}

interface PredictionGroup {
  predictions: readonly unknown[]
  context: readonly JsonObject[]
}

export interface RoboflowWebhookDetection {
  label: string
  confidence: number
  bbox?: {
    x: number
    y: number
    width: number
    height: number
  }
  imageUrl?: string
}

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  return value as JsonObject
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number.NaN
  return Number.isFinite(number) ? number : null
}

function positiveNumber(value: unknown): number | null {
  const number = finiteNumber(value)
  return number !== null && number > 0 ? number : null
}

function dimensionsFromObject(value: unknown): ImageDimensions | null {
  const object = asObject(value)
  if (!object) {
    return null
  }
  const width = positiveNumber(object.width)
  const height = positiveNumber(object.height)
  return width !== null && height !== null ? { width, height } : null
}

/** Roboflow serializes image_dimensions arrays in [height, width] order. */
function dimensionsFromArray(value: unknown): ImageDimensions | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null
  }
  const height = positiveNumber(value[0])
  const width = positiveNumber(value[1])
  return width !== null && height !== null ? { width, height } : null
}

function readDimensions(
  prediction: JsonObject,
  context: readonly JsonObject[],
): ImageDimensions | null {
  const predictionDimensions =
    dimensionsFromArray(prediction.image_dimensions) ??
    dimensionsFromArray(prediction.parent_dimensions)
  if (predictionDimensions) {
    return predictionDimensions
  }

  for (const candidate of context) {
    const dimensions =
      dimensionsFromObject(candidate.image) ??
      dimensionsFromObject(candidate.input_image) ??
      dimensionsFromArray(candidate.image_dimensions) ??
      dimensionsFromArray(candidate.parent_dimensions)
    if (dimensions) {
      return dimensions
    }
  }
  return null
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 2_048) {
    return null
  }

  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? trimmed
      : null
  } catch {
    return null
  }
}

function urlFromObject(value: unknown): string | null {
  const object = asObject(value)
  if (!object) {
    return null
  }
  return (
    httpUrl(object.url) ??
    httpUrl(object.image_url) ??
    httpUrl(object.imageUrl)
  )
}

function readImageUrl(
  prediction: JsonObject,
  context: readonly JsonObject[],
): string | null {
  const direct =
    httpUrl(prediction.imageUrl) ??
    httpUrl(prediction.image_url) ??
    urlFromObject(prediction.image)
  if (direct) {
    return direct
  }

  for (const candidate of context) {
    const url =
      httpUrl(candidate.imageUrl) ??
      httpUrl(candidate.image_url) ??
      urlFromObject(candidate.image) ??
      urlFromObject(candidate.input_image)
    if (url) {
      return url
    }
  }
  return null
}

function xywhFromArray(
  value: unknown,
  coordinates: RawBox['coordinates'],
): RawBox | null {
  if (!Array.isArray(value) || value.length < 4) {
    return null
  }
  const x = finiteNumber(value[0])
  const y = finiteNumber(value[1])
  const width = positiveNumber(value[2])
  const height = positiveNumber(value[3])
  return x !== null && y !== null && width !== null && height !== null
    ? { x, y, width, height, coordinates }
    : null
}

function xyxyFromArray(value: unknown): RawBox | null {
  if (!Array.isArray(value) || value.length < 4) {
    return null
  }
  const left = finiteNumber(value[0])
  const top = finiteNumber(value[1])
  const right = finiteNumber(value[2])
  const bottom = finiteNumber(value[3])
  if (
    left === null ||
    top === null ||
    right === null ||
    bottom === null ||
    right <= left ||
    bottom <= top
  ) {
    return null
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    coordinates: 'top-left',
  }
}

function xywhFromObject(
  value: unknown,
  coordinates: RawBox['coordinates'],
): RawBox | null {
  const object = asObject(value)
  if (!object) {
    return null
  }
  const x = finiteNumber(object.x)
  const y = finiteNumber(object.y)
  const width = positiveNumber(object.width)
  const height = positiveNumber(object.height)
  return x !== null && y !== null && width !== null && height !== null
    ? { x, y, width, height, coordinates }
    : null
}

function readRawBox(prediction: JsonObject): RawBox | null {
  // Standard Roboflow inference responses use center-based x/y fields.
  const standard = xywhFromObject(prediction, 'center')
  if (standard) {
    return standard
  }

  // Explicit bbox/box values are interpreted as conventional top-left XYWH.
  return (
    xywhFromObject(prediction.bbox, 'top-left') ??
    xywhFromArray(prediction.bbox, 'top-left') ??
    xywhFromObject(prediction.box, 'top-left') ??
    xywhFromArray(prediction.box, 'top-left') ??
    xywhFromArray(prediction.xywh, 'center') ??
    xyxyFromArray(prediction.xyxy)
  )
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function normalizeBox(
  box: RawBox,
  dimensions: ImageDimensions,
): RoboflowWebhookDetection['bbox'] | null {
  const rawLeft =
    box.coordinates === 'center' ? box.x - box.width / 2 : box.x
  const rawTop =
    box.coordinates === 'center' ? box.y - box.height / 2 : box.y
  const left = clamp(rawLeft / dimensions.width)
  const top = clamp(rawTop / dimensions.height)
  const right = clamp((rawLeft + box.width) / dimensions.width)
  const bottom = clamp((rawTop + box.height) / dimensions.height)
  const width = right - left
  const height = bottom - top

  if (width <= 0 || height <= 0) {
    return null
  }
  return { x: left, y: top, width, height }
}

function collectPredictionGroups(payload: unknown): PredictionGroup[] {
  const groups: PredictionGroup[] = []
  const visited = new WeakSet<object>()

  function visit(value: unknown, ancestors: readonly JsonObject[]) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, ancestors)
      }
      return
    }

    const object = asObject(value)
    if (!object || visited.has(object)) {
      return
    }
    visited.add(object)

    const context = [object, ...ancestors]
    if (Array.isArray(object.predictions)) {
      groups.push({ predictions: object.predictions, context })
    }

    // Roboflow Workflow outputs may be arrays, named output objects, or nested
    // model_predictions records. Walk every non-prediction child so all three
    // forms are accepted without tying ingestion to one Workflow output name.
    for (const [key, child] of Object.entries(object)) {
      if (key !== 'predictions' || !Array.isArray(child)) {
        visit(child, context)
      }
    }
  }

  visit(payload, [])
  return groups
}

function parsePrediction(
  value: unknown,
  context: readonly JsonObject[],
): RoboflowWebhookDetection | null {
  const prediction = asObject(value)
  if (!prediction) {
    return null
  }

  const rawLabel =
    prediction.label ?? prediction.class ?? prediction.class_name
  const label = typeof rawLabel === 'string' ? rawLabel.trim() : ''
  const confidence = finiteNumber(
    prediction.confidence ?? prediction.score ?? prediction.probability,
  )
  if (!label || label.length > 120 || confidence === null || confidence < 0 || confidence > 1) {
    return null
  }

  const dimensions = readDimensions(prediction, context)
  const rawBox = readRawBox(prediction)
  const bbox =
    dimensions && rawBox ? normalizeBox(rawBox, dimensions) : null
  const imageUrl = readImageUrl(prediction, context)

  return {
    label,
    confidence,
    ...(bbox ? { bbox } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  }
}

export function parseRoboflowPredictions(
  payload: unknown,
): RoboflowWebhookDetection[] {
  return collectPredictionGroups(payload).flatMap((group) =>
    group.predictions.flatMap((prediction) => {
      const parsed = parsePrediction(prediction, group.context)
      return parsed ? [parsed] : []
    }),
  )
}

export function readRoboflowWebhookSecret(): string | null {
  const secret = (process.env.ROBOFLOW_WEBHOOK_SECRET ?? '').trim()
  return secret || null
}

export async function verifyRoboflowWebhookSecret(
  configured: string,
  provided: string,
): Promise<boolean> {
  const [configuredHash, providedHash] = await Promise.all([
    sha256Hex(configured),
    sha256Hex(provided),
  ])
  return timingSafeEqualHex(configuredHash, providedHash)
}
