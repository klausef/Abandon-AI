import { ConvexError, v } from 'convex/values'
import {
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { sha256Hex, timingSafeEqualHex } from './lib/hmac'

const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 200

const optionalBoundingBox = v.optional(
  v.object({
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
  }),
)

function invalidInput(message: string): never {
  throw new ConvexError({ code: 'INVALID_INPUT', message })
}

function requireText(value: string, field: string, maxLength: number): string {
  const trimmed = value.trim()
  if (!trimmed) {
    invalidInput(`${field} is required.`)
  }
  if (trimmed.length > maxLength) {
    invalidInput(`${field} must be at most ${maxLength} characters.`)
  }
  return trimmed
}

function requirePositiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    invalidInput(`${field} must be a positive integer.`)
  }
  return value
}

function requireTimestamp(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    invalidInput(`${field} must be a non-negative timestamp.`)
  }
  return value
}

function requireMetric(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    invalidInput(`${field} must be between 0 and 1.`)
  }
  return value
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_LIST_LIMIT
  }
  return Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(value)))
}

async function assertTrainingSecret(provided: string | undefined) {
  const configured = (process.env.KAGGLE_RUN_SECRET ?? '').trim()
  if (!configured) {
    return
  }

  const expectedHash = await sha256Hex(configured)
  const providedHash = await sha256Hex(provided?.trim() ?? '')
  if (!timingSafeEqualHex(expectedHash, providedHash)) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'Training run authentication failed.',
    })
  }
}

export const startRun = mutation({
  args: {
    project: v.string(),
    version: v.number(),
    modelArch: v.string(),
    epochs: v.number(),
    startedAt: v.optional(v.number()),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertTrainingSecret(args.secret)

    return await ctx.db.insert('trainingRuns', {
      project: requireText(args.project, 'Project', 160),
      version: requirePositiveInteger(args.version, 'Version'),
      modelArch: requireText(args.modelArch, 'Model architecture', 120),
      epochs: requirePositiveInteger(args.epochs, 'Epochs'),
      status: 'running',
      startedAt:
        args.startedAt === undefined
          ? Date.now()
          : requireTimestamp(args.startedAt, 'startedAt'),
    })
  },
})

export const completeRun = mutation({
  args: {
    runId: v.id('trainingRuns'),
    mAP50: v.optional(v.number()),
    mAP50_95: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertTrainingSecret(args.secret)
    const run = await ctx.db.get(args.runId)
    if (!run) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Training run was not found.',
      })
    }

    const completedAt =
      args.completedAt === undefined
        ? Date.now()
        : requireTimestamp(args.completedAt, 'completedAt')
    if (completedAt < run.startedAt) {
      invalidInput('completedAt cannot be earlier than startedAt.')
    }

    await ctx.db.patch(args.runId, {
      status: 'completed',
      completedAt,
      ...(args.mAP50 === undefined
        ? {}
        : { mAP50: requireMetric(args.mAP50, 'mAP50') }),
      ...(args.mAP50_95 === undefined
        ? {}
        : { mAP50_95: requireMetric(args.mAP50_95, 'mAP50_95') }),
    })
    return args.runId
  },
})

export const failRun = mutation({
  args: {
    runId: v.id('trainingRuns'),
    completedAt: v.optional(v.number()),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertTrainingSecret(args.secret)
    const run = await ctx.db.get(args.runId)
    if (!run) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Training run was not found.',
      })
    }

    const completedAt =
      args.completedAt === undefined
        ? Date.now()
        : requireTimestamp(args.completedAt, 'completedAt')
    if (completedAt < run.startedAt) {
      invalidInput('completedAt cannot be earlier than startedAt.')
    }

    await ctx.db.patch(args.runId, {
      status: 'failed',
      completedAt,
    })
    return args.runId
  },
})

/** Only Convex HTTP actions may persist unverified Roboflow webhook records. */
export const saveDetection = internalMutation({
  args: {
    label: v.string(),
    confidence: v.number(),
    bbox: optionalBoundingBox,
    imageUrl: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const confidence = requireMetric(args.confidence, 'Confidence')
    const label = requireText(args.label, 'Label', 120)

    if (args.bbox) {
      const { x, y, width, height } = args.bbox
      const values = [x, y, width, height]
      if (
        values.some((value) => !Number.isFinite(value)) ||
        x < 0 ||
        y < 0 ||
        width <= 0 ||
        height <= 0 ||
        x + width > 1.000001 ||
        y + height > 1.000001
      ) {
        invalidInput('Bounding box coordinates must be normalized from 0 to 1.')
      }
    }

    let imageUrl: string | undefined
    if (args.imageUrl !== undefined) {
      imageUrl = requireText(args.imageUrl, 'Image URL', 2_048)
      let protocol: string
      try {
        protocol = new URL(imageUrl).protocol
      } catch {
        invalidInput('Image URL must be a valid HTTP or HTTPS URL.')
      }
      if (protocol !== 'http:' && protocol !== 'https:') {
        invalidInput('Image URL must use HTTP or HTTPS.')
      }
    }

    return await ctx.db.insert('roboflowDetections', {
      label,
      confidence,
      ...(args.bbox ? { bbox: args.bbox } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      receivedAt:
        args.receivedAt === undefined
          ? Date.now()
          : requireTimestamp(args.receivedAt, 'receivedAt'),
    })
  },
})

export const listRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    await ctx.db
      .query('trainingRuns')
      .withIndex('by_startedAt')
      .order('desc')
      .take(normalizeLimit(args.limit)),
})

export const listRecentDetections = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    await ctx.db
      .query('roboflowDetections')
      .withIndex('by_receivedAt')
      .order('desc')
      .take(normalizeLimit(args.limit)),
})
