import { ConvexError } from 'convex/values'
import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type AppUser = Doc<'users'>
export type AppRole = AppUser['role']

type AppErrorData = {
  code: string
  message: string
}

export function appError(code: string, message: string): ConvexError<AppErrorData> {
  return new ConvexError({ code, message })
}

/**
 * Resolves the caller from `ctx.auth.getUserIdentity()`.
 *
 * The identity provider is intentionally not chosen yet. Until one is
 * configured, this function fails closed: every user-facing query and
 * mutation that calls it is unusable from the browser. Browser-supplied
 * roles are never trusted.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<AppUser> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw appError('UNAUTHENTICATED', 'Authentication is required.')
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (query) =>
      query.eq('tokenIdentifier', identity.tokenIdentifier),
    )
    .unique()

  if (!user) {
    throw appError(
      'USER_NOT_PROVISIONED',
      'This identity has not been provisioned for the dashboard.',
    )
  }

  if (user.status !== 'Active') {
    throw appError('ACCOUNT_INACTIVE', 'This account is inactive.')
  }

  return user
}

/** Safe projection that never exposes the provider token identifier. */
export function publicUser(user: AppUser) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    badgeNumber: user.badgeNumber,
    role: user.role,
    status: user.status,
    officerId: user.officerId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
