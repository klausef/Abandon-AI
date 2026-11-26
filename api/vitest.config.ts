import { defineConfig } from 'vitest/config'

/**
 * Convex functions execute in an edge-runtime VM, so their tests run there
 * rather than in Node or jsdom.
 */
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['convex/**/*.test.ts'],
  },
})
