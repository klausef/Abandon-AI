import { defineApp } from 'convex/server'
import { v } from 'convex/values'

/**
 * Declares the environment variables this deployment expects.
 *
 * Every processor variable is optional at deploy time so that a fresh
 * deployment can start without secrets. Ingestion fails closed (HTTP 503)
 * until PROCESSOR_SHARED_SECRET is configured.
 */
const app = defineApp({
  env: {
    PROCESSOR_SHARED_SECRET: v.optional(v.string()),
    PROCESSOR_DEVICE_ID: v.optional(v.string()),
    PROCESSOR_MAX_CLOCK_SKEW_SECONDS: v.optional(v.string()),
    PROCESSOR_MAX_REQUEST_BYTES: v.optional(v.string()),
  },
})

export default app
