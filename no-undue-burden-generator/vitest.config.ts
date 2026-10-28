import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Node by default — the engine and document tests have no DOM. UI tests opt
    // into jsdom with a per-file @vitest-environment docblock, so the fast
    // majority of the suite is not paying for a DOM it never touches.
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/**/*.test.ts'],
      // src/engine is pure deterministic rules. The regulatory determinations
      // are the product; anything less than full branch coverage means a
      // regulatory path ships untested.
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
