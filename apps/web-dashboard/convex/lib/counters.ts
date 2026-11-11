import type { MutationCtx } from '../_generated/server'

/**
 * Atomically increments a named counter. Convex mutations are transactional,
 * so concurrent incident creation cannot reuse a sequence number.
 */
export async function nextCounterValue(
  ctx: MutationCtx,
  name: string,
): Promise<number> {
  const existing = await ctx.db
    .query('counters')
    .withIndex('by_name', (query) => query.eq('name', name))
    .unique()

  if (!existing) {
    await ctx.db.insert('counters', { name, value: 1 })
    return 1
  }

  const nextValue = existing.value + 1
  await ctx.db.patch(existing._id, { value: nextValue })
  return nextValue
}
