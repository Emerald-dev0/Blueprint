import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { normalizePath } from '../../apps/desktop/src/lib/platform';
import { ROUTES } from '../../apps/desktop/src/lib/routes';

const APP_DIR = resolve(process.cwd(), 'apps/desktop/src/app');

/** Every route the App Router will actually serve, read off the filesystem. */
function pageRoutes(dir: string = APP_DIR, base = ''): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...pageRoutes(full, `${base}/${entry.name}`));
    } else if (entry.name === 'page.tsx') {
      routes.push(base === '' ? '/' : base);
    }
  }
  return routes.sort();
}

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

  it('puts the project home at the root', () => {
    expect(ROUTES.projects).toBe('/');
  });

  it('never points at a page that does not exist', () => {
    // The navigation rail, the command palette and every in-page link are built
    // from ROUTES, so a stale entry here is a dead control in the UI.
    const served = pageRoutes();
    for (const [key, path] of Object.entries(ROUTES)) {
      expect(served, `ROUTES.${key} -> ${path} has no page.tsx`).toContain(path);
    }
  });

  it('leaves no page unreachable from the route table', () => {
    const declared = Object.values(ROUTES).slice().sort();
    expect(declared).toEqual(pageRoutes());
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
