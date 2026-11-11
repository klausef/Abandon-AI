import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { recordActivity } from './lib/audit'
import { appError, getCurrentUser } from './lib/auth'
import { requirePermission } from './lib/permissions'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'detections:view')

    const models = await ctx.db.query('modelVersions').collect()
    return models.sort(
      (first, second) => second.lastReportedAt - first.lastReportedAt,
    )
  },
})

/**
 * Records the result of a manual model inspection (Phase 8).
 *
 * Processors can declare a class list when they report a model, but only an
 * administrator can mark that list as verified.
 */
export const markVerified = mutation({
  args: {
    modelVersionId: v.id('modelVersions'),
    supportedClasses: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'settings:view')

    const model = await ctx.db.get(args.modelVersionId)
    if (!model) {
      throw appError('MODEL_NOT_FOUND', 'The model version was not found.')
    }

    const supportedClasses = Array.from(
      new Set(
        args.supportedClasses.map((value) => value.trim()).filter(Boolean),
      ),
    )

    if (supportedClasses.length === 0) {
      throw appError(
        'INVALID_CLASS_LIST',
        'At least one supported class is required.',
      )
    }
    if (supportedClasses.length > 200) {
      throw appError(
        'INVALID_CLASS_LIST',
        'A model may declare at most 200 supported classes.',
      )
    }
    if (supportedClasses.some((value) => value.length > 64)) {
      throw appError(
        'INVALID_CLASS_LIST',
        'Class names must be at most 64 characters.',
      )
    }

    const notes = args.notes?.trim() ?? ''
    if (notes.length > 1_000) {
      throw appError(
        'INVALID_INPUT',
        'Verification notes must be at most 1000 characters.',
      )
    }

    const now = Date.now()
    await ctx.db.patch(model._id, {
      declaredSupportedClasses: supportedClasses,
      classesVerified: true,
      verifiedAt: now,
      verificationNotes: notes.length > 0 ? notes : null,
    })

    await recordActivity(ctx, {
      type: 'model_verified',
      actor,
      targetType: 'modelVersion',
      targetId: model.key,
      description: `Model ${model.key} class list marked verified (${supportedClasses.length} classes).`,
      createdAt: now,
    })

    return await ctx.db.get(model._id)
  },
})
