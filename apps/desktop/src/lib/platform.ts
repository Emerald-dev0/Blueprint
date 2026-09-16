/**
 * Platform and host-environment helpers.
 *
 * Blueprint ships to Windows, Linux and macOS. Anything that renders an OS
 * specific string, shortcut, or path must go through this module instead of
 * hard-coding macOS conventions — the previous build shipped "Cmd + K" hints to
 * Windows and Linux users, who have no Cmd key.
 */

import * as React from 'react';

/** Coarse desktop platform, resolved once on the client. */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * `true` when running inside a Tauri WebView.
 *
 * The renderer is also served by `next dev` in a plain browser, where no Rust
 * backend exists and every `invoke()` rejects. UI code must branch on this
 * rather than letting promise rejections surface as red "Error:" bubbles.
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';

  // `userAgentData` is Chromium-only (WebView2 on Windows) but is the most
  // reliable signal there, since the UA string is being frozen.
  const highEntropy = (
    navigator as Navigator & {
      userAgentData?: { platform?: string };
    }
  ).userAgentData?.platform;

  const source = (highEntropy ?? navigator.platform ?? navigator.userAgent).toLowerCase();

  if (source.includes('win')) return 'windows';
  if (source.includes('mac') || source.includes('iphone') || source.includes('ipad')) return 'macos';
  if (source.includes('linux') || source.includes('x11') || source.includes('ubuntu')) return 'linux';
  return 'unknown';
}

/** Modifier key label for the current OS: "⌘" on macOS, "Ctrl" elsewhere. */
export function modifierKey(): string {
  return getPlatform() === 'macos' ? '⌘' : 'Ctrl';
}

/** e.g. "⌘K" on macOS, "Ctrl+K" on Windows/Linux. */
export function shortcut(key: string): string {
  return getPlatform() === 'macos' ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`;
}

/**
 * True when the user's primary modifier is held (Cmd on macOS, Ctrl on
 * Windows/Linux). Deliberately does *not* accept both everywhere: on
 * Windows/Linux, Ctrl is the convention and treating Cmd as equivalent only
 * creates ambiguity with browser shortcuts.
 */
export function isModifierPressed(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return getPlatform() === 'macos' ? event.metaKey : event.ctrlKey;
}

/**
 * React hook form of {@link getPlatform}.
 *
 * Returns `null` on the server and for the first client render, then resolves.
 * That ordering matters: `output: 'export'` pre-renders every page, so reading
 * `navigator` during render would produce markup that differs between the
 * pre-render and the client and trigger a hydration mismatch on every load.
 */
export function usePlatform(): Platform | null {
  const [platform, setPlatform] = React.useState<Platform | null>(null);
  React.useEffect(() => {
    setPlatform(getPlatform());
  }, []);
  return platform;
}

/**
 * Normalize a Next.js pathname so it can be compared against route constants.
 *
 * With `trailingSlash: true` (required for Tauri static serving) `usePathname()`
 * returns "/ai/" rather than "/ai". Comparing raw pathnames against hrefs would
 * silently break every active-nav state in the packaged app while working in dev.
 */
export function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  if (pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}
