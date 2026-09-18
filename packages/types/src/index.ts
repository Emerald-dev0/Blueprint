/**
 * Contracts that cross a package boundary.
 *
 * This file used to hold the entire domain vocabulary - AI providers and models,
 * project intelligence, design tokens, memory tiers, ADRs, GitHub issues and
 * pull requests - and almost none of it was imported. The app's real contracts
 * live next to the code that produces or consumes them:
 * `apps/desktop/src/lib/ipc.ts` mirrors what the Rust commands serialize, and
 * `@blueprint/git-engine` owns the git/GitHub surface under contract test.
 *
 * The duplicates here did not merely go unused, they drifted: `TechStack`
 * declared `language` where the scanner sends `languages`, `MemoryEntry`
 * declared `metadata?: string` where the core sends `metadata: string | null`,
 * and the AI block described model selection and sampling options
 * (`temperature`, `maxTokens`, `topP`, `stop`) that no command accepts.
 *
 * Types for capabilities that do not exist yet are deliberately absent. A
 * declared `GitHubIssue` is exactly what a fabricated `listIssues()` gets
 * written against - four such methods shipped once, invoking commands the core
 * never implemented. When issue and pull-request commands are added, their wire
 * types come with them.
 */

/**
 * A repository as the renderer sees it: GitHub's own payload mapped to
 * camelCase by `toGitHubRepository` in `@blueprint/git-engine`.
 *
 * Declared here rather than in the app because a workspace package cannot
 * import from an app, and both the SDK and the renderer need it.
 */
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  language: string | null;
  stars: number;
  updatedAt: string;
}
