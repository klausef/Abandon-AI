/** Session-scoped track identity shared by the processor and Convex. */
export function buildTrackKey(
  cameraExternalId: string,
  processingSessionId: string,
  trackingId: number,
): string {
  return `${cameraExternalId}:${processingSessionId}:${trackingId}`
}

/** Stable model identity independent of the Convex document ID. */
export function buildModelKey(
  provider: string,
  name: string,
  version: string,
): string {
  return `${provider}:${name}:${version}`
}
