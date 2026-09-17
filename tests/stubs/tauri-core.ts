import { vi } from 'vitest';

/**
 * Stand-in for `@tauri-apps/api/core` in unit tests, aliased in
 * `vitest.config.ts` and mapped in the root `tsconfig.json` paths.
 *
 * The real module reads `window.__TAURI_INTERNALS__` when a command is invoked,
 * so calling it under `environment: 'node'` throws "window is not defined"
 * before a test can assert anything. `vi.mock('@tauri-apps/api/core')` does not
 * help either: pnpm's strict layout means the package resolves only from inside
 * `packages/*` and `apps/*`, not from `tests/`, so the mock gets registered for
 * a specifier the test can resolve while the module under test loads a different
 * copy. An alias is the only interception point both sides share.
 *
 * Tests import {@link invokeMock} to assert on calls and to queue responses;
 * code under test imports {@link invoke}, which is the same object carrying the
 * real generic signature.
 */
type InvokeSignature = <T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
) => Promise<T>;

/** The Vitest mock: assertions and canned responses go through this. */
export const invokeMock = vi.fn();

/** What modules under test import - the mock, typed like the real `invoke`. */
export const invoke = invokeMock as unknown as InvokeSignature;

/** Present so a module that only touches asset paths can still be imported. */
export function convertFileSrc(filePath: string): string {
  return filePath;
}
