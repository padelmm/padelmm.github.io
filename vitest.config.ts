/**
 * Vitest configuration.
 *
 * Kept separate from `vite.config.ts` so the test runner doesn't pull
 * in the PWA plugin or the React JSX transform (which slow startup
 * and aren't needed for pure-function unit tests). If we later add
 * component tests with `@testing-library/react` we can layer the
 * React plugin in conditionally.
 *
 * Globs are anchored at `src/**` so colocated `*.test.ts` files live
 * next to the code they exercise. A separate `tests/` top-level
 * directory is reserved for the future CLI / integration harness
 * (PRD item 7, phase 2).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment is sufficient: every test target is a pure
    // function (`teams.ts`, `score-color.ts`, `defaults.ts`, etc.)
    // with no DOM or React dependency. Component tests, when we add
    // them, will move to jsdom via a project override.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // CI-friendly defaults: deterministic, no watch, fail fast on
    // unhandled rejections in test setup.
    pool: 'forks',
    isolate: true,
    // Reasonable defaults; bump if a generator-fuzz test needs more.
    testTimeout: 5_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts'],
    },
  },
});
