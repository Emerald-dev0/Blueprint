import { invoke } from '@tauri-apps/api/core';
import type { GitHubRepository } from '@blueprint/types';

/**
 * The git and GitHub surface of the Rust core.
 *
 * Every function here maps 1:1 onto a command that exists in
 * `apps/desktop/src-tauri/src/main.rs`'s `generate_handler!` list, and the
 * types describe exactly what those commands serialize. That pairing is the
 * point: this file is the contract, so a rename on the Rust side has to be
 * mirrored here or the unit tests in `tests/unit/git-engine.test.ts` fail.
 *
 * ## What is deliberately absent
 *
 * Commits, pushes, issues and pull requests. An earlier version of this SDK
 * exposed `commit()`, `push()`, `listIssues()` and `createPullRequest()`,
 * invoking `create_git_commit`, `push_git_changes`, `list_github_issues` and
 * `create_github_pull_request`. None of those commands exist in the Rust core,
 * so all four rejected at runtime with "command not found" - and because
 * nothing imported this package, nothing ever caught it. A method that cannot
 * work is worse than no method: it advertises a capability the product does
 * not have. They return when the core implements them.
 *
 * The GitHub wire types for issues and pull requests stay in `@blueprint/types`
 * (they accurately describe GitHub's API) but no command produces them yet.
 */

/**
 * `list_github_repositories` forwards GitHub's own JSON, so these are the wire
 * names the Rust `GitHubRepo` struct serializes. Never consume this shape in UI
 * code; map it once with {@link toGitHubRepository}.
 */
export interface GitHubRepoPayload {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  /** GitHub's field is `html_url`; the Rust struct renames its `url` to it. */
  html_url: string;
  /** GitHub's field is `private`; the Rust struct renames `is_private` to it. */
  private: boolean;
  language: string | null;
  /** GitHub's field is `stargazers_count`. */
  stargazers_count: number;
  updated_at: string;
}

/** Wire payload -> camelCase domain type used across the renderer. */
export function toGitHubRepository(raw: GitHubRepoPayload): GitHubRepository {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    url: raw.html_url,
    isPrivate: raw.private,
    language: raw.language,
    stars: raw.stargazers_count,
    updatedAt: raw.updated_at,
  };
}

/** One entry of `git status`, as classified by the Rust core. */
export interface FileStatus {
  path: string;
  /** `staged-new`, `modified`, `deleted`, `renamed`, `untracked`, ... */
  state: string;
}

export interface CommitSummary {
  /** Abbreviated oid (7 characters). */
  id: string;
  summary: string;
  author: string;
  /** Commit time in Unix **seconds**. */
  time: number;
}

/**
 * Real state of the open repository: branch, divergence from its upstream and
 * the working tree. `ahead`/`behind` are 0 when no upstream is configured.
 */
export interface GitStatusReport {
  repository_root: string;
  branch: string;
  is_clean: boolean;
  ahead: number;
  behind: number;
  files: FileStatus[];
  recent_commits: CommitSummary[];
}

/**
 * Repositories belonging to the authenticated account (GitHub REST, 50 most
 * recently updated). Rejects with a readable message when no token is stored -
 * the fix is {@link setGitHubCredential}, which the Settings → GitHub tab
 * exposes.
 */
export async function listGitHubRepositories(): Promise<GitHubRepository[]> {
  const raw = await invoke<GitHubRepoPayload[]>('list_github_repositories');
  return raw.map(toGitHubRepository);
}

/** Status of the repository currently open in Blueprint. */
export function getGitStatus(): Promise<GitStatusReport> {
  return invoke<GitStatusReport>('get_git_status');
}

/**
 * Create a branch off HEAD. The core rejects names with control characters,
 * whitespace, `..`, `@{`, a leading `-` or a trailing `.` before touching
 * libgit2.
 */
export function createGitBranch(name: string): Promise<void> {
  return invoke<void>('create_git_branch', { name });
}

/**
 * Release notes for `tag`: the last 200 commits reachable from it, grouped by
 * conventional-commit prefix. Falls back to HEAD when the tag does not exist.
 */
export function generateReleaseNotes(tag: string): Promise<string> {
  return invoke<string>('generate_github_release_notes', { tag });
}

/**
 * A deterministic commit message derived from the *actual* working tree of the
 * open repository plus the supplied diff text (the diff is only measured for
 * review size - it is not sent to a model).
 */
export function suggestCommitMessage(diff: string): Promise<string> {
  return invoke<string>('suggest_git_commit_message', { diff });
}

/**
 * Store a GitHub personal access token in the operating system credential
 * store. Never written to disk by Blueprint and never logged; the audit trail
 * records only the byte length.
 */
export function setGitHubCredential(token: string): Promise<void> {
  return invoke<void>('set_github_credential', { token });
}
