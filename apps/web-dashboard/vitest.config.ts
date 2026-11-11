import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Two test environments share one configuration:
 *
 * - `frontend` runs the React dashboard tests in jsdom and keeps the existing
 *   Phase 1-6 behaviour untouched.
 * - `convex` runs backend function tests inside an edge-runtime VM, which is
 *   the runtime Convex functions execute in.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'convex',
          environment: 'edge-runtime',
          include: ['convex/**/*.test.ts'],
        },
      },
    ],
  },
})
