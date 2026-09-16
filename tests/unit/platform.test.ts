import { describe, expect, it } from 'vitest';

import { normalizePath } from '../../apps/desktop/src/lib/platform';
import { ROUTES } from '../../apps/desktop/src/lib/routes';

describe('normalizePath', () => {
  it('maps the root to itself', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath(null)).toBe('/');
    expect(normalizePath(undefined)).toBe('/');
  });

  it('strips the trailing slash that `trailingSlash: true` adds inside the packaged app', () => {
    // This is the regression the packaged Windows/Linux build hit: Next reports
    // "/ai/" at runtime, so raw comparison against the "/ai" route constant
    // cleared every active-navigation state.
    expect(normalizePath('/ai/')).toBe('/ai');
    expect(normalizePath('/ai/aos/')).toBe('/ai/aos');
  });

  it('leaves already-normalized paths untouched', () => {
    expect(normalizePath('/memory')).toBe('/memory');
  });
});

describe('route table', () => {
  it('has unique paths for every entry', () => {
    const paths = Object.values(ROUTES);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps the workspace root and the projects route distinct', () => {
    expect(ROUTES.projects).toBe('/');
    expect(ROUTES.workspace).not.toBe(ROUTES.projects);
  });
});

describe('shortcut labels', () => {
  it('agree with the detected platform and never throw during render', async () => {
    // These helpers are called during render on pre-rendered pages, so they
    // must tolerate any host environment (browser, Node, or none).
    const { getPlatform, shortcut, modifierKey } = await import(
      '../../apps/desktop/src/lib/platform'
    );

    const platform = getPlatform();
    expect(['windows', 'macos', 'linux', 'unknown']).toContain(platform);

    if (platform === 'macos') {
      expect(modifierKey()).toBe('⌘');
      expect(shortcut('k')).toBe('⌘K');
    } else {
      expect(modifierKey()).toBe('Ctrl');
      expect(shortcut('k')).toBe('Ctrl+K');
    }
  });
});
