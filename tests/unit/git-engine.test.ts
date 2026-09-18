import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Contract tests for `@blueprint/git-engine`.
 *
 * The package used to expose four methods whose Tauri commands do not exist in
 * the Rust core, and nothing caught it because the package was never imported
 * and never tested. These tests pin both halves of the contract: the exact
 * command names and argument keys the SDK invokes, and - by reading
 * `main.rs` - that every one of those commands is actually registered.
 */

// Both specifiers below resolve through the alias in vitest.config.ts (and the
// matching `paths` entry in tsconfig.json), which is the one interception point
// this test and the package under test can share: `invokeMock` is the Vitest
// mock, and the SDK imports the same object as `invoke`.
import { invokeMock } from '@tauri-apps/api/core';
import * as gitEngine from '../../packages/git-engine/src/index';

/** Command names present in the Rust `generate_handler!` list. */
function registeredCommands(): Set<string> {
  const mainRs = readFileSync(resolve(process.cwd(), 'apps/desktop/src-tauri/src/main.rs'), 'utf8');
  const start = mainRs.indexOf('generate_handler![');
  expect(start, 'main.rs must register its command table').toBeGreaterThan(-1);
  const block = mainRs.slice(start);
  const end = block.indexOf('])');
  const table = block.slice(0, end > -1 ? end : undefined);

  const names = new Set<string>();
  for (const match of table.matchAll(/::\s*([a-z_][a-z0-9_]*)/g)) {
    names.add(match[1]);
  }
  return names;
}

/** A `list_github_repositories` payload exactly as GitHub (and the Rust
 *  `GitHubRepo` serde renames) put it on the wire. */
const wireRepo = {
  id: 781_234_567,
  name: 'blueprint',
  full_name: 'Emerald-dev0/Blueprint',
  description: 'AI engineering command center',
  html_url: 'https://github.com/Emerald-dev0/Blueprint',
  private: false,
  language: 'Rust',
  stargazers_count: 42,
  updated_at: '2026-09-17T10:00:00Z',
};

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
});

describe('GitHub repository mapping', () => {
  it('maps every wire field, including the two the UI used to read wrongly', () => {
    const mapped = gitEngine.toGitHubRepository(wireRepo);

    expect(mapped).toEqual({
      id: 781_234_567,
      name: 'blueprint',
      fullName: 'Emerald-dev0/Blueprint',
      description: 'AI engineering command center',
      url: 'https://github.com/Emerald-dev0/Blueprint',
      isPrivate: false,
      language: 'Rust',
      stars: 42,
      updatedAt: '2026-09-17T10:00:00Z',
    });
    // `r.url` and `r.stars` do not exist on the wire; they were read as
    // `undefined` by the old hand-written mapping in the GitHub page.
    expect(mapped.url).toBeDefined();
    expect(mapped.stars).toBe(42);
  });

  it('keeps a null description as null rather than stringifying it', () => {
    const mapped = gitEngine.toGitHubRepository({ ...wireRepo, description: null });
    expect(mapped.description).toBeNull();
  });

  it('marks private repositories', () => {
    expect(gitEngine.toGitHubRepository({ ...wireRepo, private: true }).isPrivate).toBe(true);
  });
});

describe('command surface', () => {
  it('lists repositories and maps the payload', async () => {
    invokeMock.mockResolvedValue([wireRepo]);

    const repos = await gitEngine.listGitHubRepositories();

    expect(invokeMock).toHaveBeenCalledWith('list_github_repositories');
    expect(repos).toHaveLength(1);
    expect(repos[0].fullName).toBe('Emerald-dev0/Blueprint');
  });

  it('requests git status with no arguments', async () => {
    await gitEngine.getGitStatus();
    expect(invokeMock).toHaveBeenCalledWith('get_git_status');
  });

  it('passes a branch name under the key the Rust command expects', async () => {
    await gitEngine.createGitBranch('feature/release-notes');
    expect(invokeMock).toHaveBeenCalledWith('create_git_branch', {
      name: 'feature/release-notes',
    });
  });

  it('passes a release tag under the key the Rust command expects', async () => {
    await gitEngine.generateReleaseNotes('v0.2.0');
    expect(invokeMock).toHaveBeenCalledWith('generate_github_release_notes', { tag: 'v0.2.0' });
  });

  it('passes the diff under the key the Rust command expects', async () => {
    await gitEngine.suggestCommitMessage('diff --git a/x b/x');
    expect(invokeMock).toHaveBeenCalledWith('suggest_git_commit_message', {
      diff: 'diff --git a/x b/x',
    });
  });

  it('stores a credential under the key the Rust command expects', async () => {
    await gitEngine.setGitHubCredential('ghp_secret');
    expect(invokeMock).toHaveBeenCalledWith('set_github_credential', { token: 'ghp_secret' });
  });

  it('invokes nothing that the Rust core does not register', async () => {
    invokeMock.mockResolvedValue([]);
    const registered = registeredCommands();
    expect(registered.size, 'main.rs must register commands').toBeGreaterThan(10);

    await gitEngine.listGitHubRepositories();
    await gitEngine.getGitStatus();
    await gitEngine.createGitBranch('b');
    await gitEngine.generateReleaseNotes('v1');
    await gitEngine.suggestCommitMessage('');
    await gitEngine.setGitHubCredential('t');

    const invoked = invokeMock.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(invoked.length).toBe(6);
    for (const command of invoked) {
      expect(registered, `${command} is not in generate_handler!`).toContain(command);
    }
  });
});

describe('capabilities that do not exist', () => {
  it('no longer advertises commit, push, issue or pull-request methods', () => {
    // These invoked `create_git_commit`, `push_git_changes`,
    // `list_github_issues` and `create_github_pull_request`, none of which the
    // core implements. Re-adding them without the Rust side is a regression.
    const exported = Object.keys(gitEngine);
    for (const removed of ['commit', 'push', 'listIssues', 'createPullRequest']) {
      expect(exported, `${removed} has no backing command`).not.toContain(removed);
    }
  });

  it('exports a documented function per implemented capability', () => {
    expect(Object.keys(gitEngine).sort()).toEqual(
      [
        'createGitBranch',
        'generateReleaseNotes',
        'getGitStatus',
        'listGitHubRepositories',
        'setGitHubCredential',
        'suggestCommitMessage',
        'toGitHubRepository',
      ].sort(),
    );
  });
});
