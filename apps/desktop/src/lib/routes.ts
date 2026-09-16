/**
 * Single source of truth for renderer routes.
 *
 * Route strings were previously duplicated between the navigation rail, the
 * command bar and the workspace store, and the store's `activeSystem` union
 * drifted from the actual App Router pages (`projects` and `workspace` are not
 * both real routes; `/design-system` existed with no nav entry). Keeping them
 * here means a rename is a one-line change and the nav can never point at a
 * route that does not exist.
 */

export const ROUTES = {
  projects: '/',
  workspace: '/workspace',
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
