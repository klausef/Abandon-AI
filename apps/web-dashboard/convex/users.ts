import { v } from 'convex/values'
import type { MutationCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { recordActivity } from './lib/audit'
import { appError, getCurrentUser, publicUser } from './lib/auth'
import { requirePermission } from './lib/permissions'
import { userRole, userStatus } from './validators'

export const me = query({
  args: {},
  handler: async (ctx) => {
    return publicUser(await getCurrentUser(ctx))
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'users:manage')

    const users = await ctx.db.query('users').collect()
    return users
      .map(publicUser)
      .sort((first, second) =>
        first.fullName.localeCompare(second.fullName),
      )
  },
})

export const listAssignableOfficers = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'incidents:manage')

    const securityOfficers = await ctx.db
      .query('users')
      .withIndex('by_role', (query) =>
        query.eq('role', 'Security Officer'),
      )
      .collect()
    const supervisors = await ctx.db
      .query('users')
      .withIndex('by_role', (query) => query.eq('role', 'Supervisor'))
      .collect()

    return [...securityOfficers, ...supervisors]
      .filter((user) => user.status === 'Active')
      .map(publicUser)
      .sort((first, second) =>
        first.fullName.localeCompare(second.fullName),
      )
  },
})

async function assertAdministratorRemains(
  ctx: MutationCtx,
  excludedUserId: string,
): Promise<void> {
  const administrators = await ctx.db
    .query('users')
    .withIndex('by_role', (query) => query.eq('role', 'Administrator'))
    .collect()

  const hasAnotherAdministrator = administrators.some(
    (user) => user._id !== excludedUserId && user.status === 'Active',
  )

  if (!hasAnotherAdministrator) {
    throw appError(
      'LAST_ADMINISTRATOR',
      'At least one active administrator is required.',
    )
  }
}

export const updateRole = mutation({
  args: {
    userId: v.id('users'),
    role: userRole,
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'users:manage')

    const target = await ctx.db.get(args.userId)
    if (!target) {
      throw appError('USER_NOT_FOUND', 'The user was not found.')
    }

    if (target._id === actor._id && args.role !== 'Administrator') {
      throw appError(
        'CANNOT_DEMOTE_SELF',
        'Administrators cannot remove their own administrator role.',
      )
    }

    if (target.role === 'Administrator' && args.role !== 'Administrator') {
      await assertAdministratorRemains(ctx, target._id)
    }

    if (target.role === args.role) {
      return publicUser(target)
    }

    const now = Date.now()
    await ctx.db.patch(target._id, { role: args.role, updatedAt: now })

    await recordActivity(ctx, {
      type: 'user_role_changed',
      actor,
      targetType: 'user',
      targetId: target._id,
      description: `${target.fullName} role changed from ${target.role} to ${args.role}.`,
      createdAt: now,
    })

    return publicUser((await ctx.db.get(target._id)) as typeof target)
  },
})

export const setStatus = mutation({
  args: {
    userId: v.id('users'),
    status: userStatus,
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx)
    requirePermission(actor, 'users:manage')

    const target = await ctx.db.get(args.userId)
    if (!target) {
      throw appError('USER_NOT_FOUND', 'The user was not found.')
    }

    if (target._id === actor._id && args.status !== 'Active') {
      throw appError(
        'CANNOT_DEACTIVATE_SELF',
        'Administrators cannot deactivate their own account.',
      )
    }

    if (target.role === 'Administrator' && args.status !== 'Active') {
      await assertAdministratorRemains(ctx, target._id)
    }

    if (target.status === args.status) {
      return publicUser(target)
    }

    const now = Date.now()
    await ctx.db.patch(target._id, { status: args.status, updatedAt: now })

    await recordActivity(ctx, {
      type: 'user_status_changed',
      actor,
      targetType: 'user',
      targetId: target._id,
      description: `${target.fullName} account status changed to ${args.status}.`,
      createdAt: now,
    })

    return publicUser((await ctx.db.get(target._id)) as typeof target)
  },
})
