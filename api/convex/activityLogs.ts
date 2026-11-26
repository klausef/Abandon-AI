import { v } from 'convex/values'
import { query } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import { requirePermission } from './lib/permissions'
import { activityLogType } from './validators'

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 50
  }
  return Math.min(Math.max(Math.trunc(value), 1), 200)
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(activityLogType),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'users:manage')

    const limit = clampLimit(args.limit)

    if (args.type) {
      return await ctx.db
        .query('activityLogs')
        .withIndex('by_type_createdAt', (query) =>
          query.eq('type', args.type as NonNullable<typeof args.type>),
        )
        .order('desc')
        .take(limit)
    }

    return await ctx.db
      .query('activityLogs')
      .withIndex('by_createdAt')
      .order('desc')
      .take(limit)
  },
})
