/**
 * Single source of truth for renderer routes.
 *
 * Route strings were previously duplicated between the navigation rail, the
 * command bar and the workspace store, and the store's `activeSystem` union
 * drifted from the actual App Router pages (`/design-system` existed with no nav
 * entry). Keeping them here means a rename is a one-line change and the nav can
 * never point at a route that does not exist.
 *
 * `workspace` was dropped along with its page: `/` is the project home and shows
 * the open repository, so a second route for the same single-project concept
 * only produced a placeholder.
 */

export const ROUTES = {
  projects: '/',
  intelligence: '/intelligence',
  ai: '/ai',
  aos: '/ai/aos',
  github: '/github',
  memory: '/memory',
  settings: '/settings',
  designSystem: '/design-system',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
