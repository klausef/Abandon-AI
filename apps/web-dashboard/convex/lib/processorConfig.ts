export interface ProcessorConfig {
  sharedSecret: string
  /** Optional allowlist. When empty, any registered, active device is accepted. */
  allowedDeviceIds: readonly string[]
  maxClockSkewSeconds: number
  maxRequestBytes: number
}

const MINIMUM_SECRET_LENGTH = 32
const DEFAULT_CLOCK_SKEW_SECONDS = 300
const DEFAULT_MAX_REQUEST_BYTES = 262_144

function readEnv(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined
  }
  return process.env[name]
}

function readBoundedInteger(
  rawValue: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!rawValue) {
    return fallback
  }
  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return fallback
  }
  return parsed
}

/**
 * Reads processor ingestion settings from the deployment environment.
 *
 * Returns null when no usable secret is configured, which makes the HTTP
 * endpoint fail closed with 503 instead of accepting unsigned requests.
 */
export function readProcessorConfig(): ProcessorConfig | null {
  const sharedSecret = readEnv('PROCESSOR_SHARED_SECRET')?.trim() ?? ''
  if (sharedSecret.length < MINIMUM_SECRET_LENGTH) {
    return null
  }

  const allowedDeviceIds = (readEnv('PROCESSOR_DEVICE_ID') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return {
    sharedSecret,
    allowedDeviceIds,
    maxClockSkewSeconds: readBoundedInteger(
      readEnv('PROCESSOR_MAX_CLOCK_SKEW_SECONDS'),
      DEFAULT_CLOCK_SKEW_SECONDS,
      30,
      3_600,
    ),
    maxRequestBytes: readBoundedInteger(
      readEnv('PROCESSOR_MAX_REQUEST_BYTES'),
      DEFAULT_MAX_REQUEST_BYTES,
      1_024,
      1_048_576,
    ),
  }
}

export function isDeviceAllowed(
  config: ProcessorConfig,
  deviceId: string,
): boolean {
  return (
    config.allowedDeviceIds.length === 0 ||
    config.allowedDeviceIds.includes(deviceId)
  )
}
