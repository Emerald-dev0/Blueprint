import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `@tauri-apps/api` is only installed inside `packages/*` and `apps/*`
  // (pnpm's strict layout), so a test under `tests/` cannot resolve it and
  // `vi.mock` cannot intercept the copy the module under test loads. The alias
  // gives both sides one shared, inert implementation - see
  // `tests/stubs/tauri-core.ts`.
  resolve: {
    alias: {
      '@tauri-apps/api/core': fileURLToPath(new URL('./tests/stubs/tauri-core.ts', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
