import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BlueprintPlugin,
  type BlueprintAPI,
  type PluginManifest,
} from '../../packages/plugin-sdk/src/index';
import { usePluginStore } from '../../apps/desktop/src/store/plugins';
import DesignIntelligence from '../../plugins/design-intelligence/src/index';
import RepoIntelligence from '../../plugins/repo-intelligence/src/index';
import WebIntelligence from '../../plugins/web-intelligence/src/index';
import WorkflowPack from '../../plugins/workflow-pack/src/index';

/**
 * Contract tests for the plugin layer.
 *
 * Nothing in Blueprint loads plugin code yet, which is exactly why these tests
 * exist: an inert layer drifts silently. Five manifests used to declare
 * `"entrypoints": { "frontend": "src/index.ts" }` for a file that did not exist,
 * one declared a `commands` block no parser reads, three requested `ui.tab` for
 * a tab strip that has been removed, and the SDK offered `github.createIssue`
 * against a command the Rust core does not have. Each of those is pinned here.
 *
 * The palette itself is React and the suite runs under `environment: 'node'`, so
 * rendering is not asserted; what is asserted is the registry the palette reads
 * (`usePluginStore`) and the plugins that would fill it.
 */

const ROOT = process.cwd();
const PLUGIN_ROOT = resolve(ROOT, 'plugins');

/** Every plugin directory that ships a manifest. */
function pluginDirs(): string[] {
  return readdirSync(PLUGIN_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function manifestOf(dir: string): PluginManifest & Record<string, unknown> {
  return JSON.parse(readFileSync(join(PLUGIN_ROOT, dir, 'manifest.json'), 'utf8'));
}

/**
 * The permissions the SDK declares, read out of its source. A type union has no
 * runtime representation, so parsing is the only way to keep this test and the
 * SDK from drifting - the same approach `git-engine.test.ts` takes with
 * `main.rs`.
 */
function sdkPermissions(): Set<string> {
  const source = readFileSync(resolve(ROOT, 'packages/plugin-sdk/src/index.ts'), 'utf8');
  const union = source.match(/export type Permission =([\s\S]*?);/);
  expect(union, 'the SDK must declare a Permission union').not.toBeNull();
  expect(union![1].includes('|'), 'the union must still list its members').toBe(true);
  // Quotes are matched either way round: the union is written with single
  // quotes, and a formatter configured differently would not be a reason for this
  // test to silently pass with an empty set.
  return new Set([...union![1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]));
}

/**
 * The manifest keys the Rust parser actually declares, read out of
 * `plugins/manager.rs`. `serde` ignores unknown fields by default, so a key no
 * struct field claims is inert metadata that reads like configuration.
 */
function rustManifestKeys(): Set<string> {
  const source = readFileSync(
    resolve(ROOT, 'apps/desktop/src-tauri/src/plugins/manager.rs'),
    'utf8',
  );
  const start = source.indexOf('pub struct PluginManifest');
  expect(start, 'manager.rs must declare PluginManifest').toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf('\n}', start));

  const keys = new Set<string>();
  let rename: string | null = null;
  for (const line of body.split('\n')) {
    const renamed = line.match(/#\[serde\(rename = "([^"]+)"/);
    if (renamed) {
      rename = renamed[1];
      continue;
    }
    const field = line.match(/^\s*pub (\w+):/);
    if (field) {
      keys.add(rename ?? field[1]);
      rename = null;
    }
  }
  return keys;
}

/** Command names present in the Rust `generate_handler!` list. */
function registeredCommands(): Set<string> {
  const mainRs = readFileSync(resolve(ROOT, 'apps/desktop/src-tauri/src/main.rs'), 'utf8');
  const start = mainRs.indexOf('generate_handler![');
  expect(start, 'main.rs must register its command table').toBeGreaterThan(-1);
  const block = mainRs.slice(start, mainRs.indexOf(']', start));
  const names = [...block.matchAll(/([a-z_0-9]+)\s*,?\s*$/gm)]
    .map((m) => m[1])
    .filter((name) => name !== 'generate_handler');
  expect(names.length, 'the handler list should not be empty').toBeGreaterThan(0);
  return new Set(names);
}

/** A `BlueprintAPI` that records what a plugin does to it. */
function recordingApi() {
  const commands: { id: string; label: string; handler: () => void }[] = [];
  const published: { event: string; data: unknown }[] = [];
  const api: BlueprintAPI = {
    events: {
      subscribe: () => {},
      publish: (event, data) => {
        published.push({ event, data });
      },
    },
    registerCommand: (id, label, handler) => {
      commands.push({ id, label, handler });
    },
  };
  return { api, commands, published };
}

const FIRST_PARTY = [
  { dir: 'design-intelligence', Plugin: DesignIntelligence, command: 'design.extract-tokens' },
  { dir: 'repo-intelligence', Plugin: RepoIntelligence, command: 'repo.scan' },
  { dir: 'web-intelligence', Plugin: WebIntelligence, command: 'web.analyze-url' },
  { dir: 'workflow-pack', Plugin: WorkflowPack, command: 'workflow.plan' },
] as const;

describe('plugin manifests', () => {
  it('ships only plugins that have code', () => {
    expect(pluginDirs()).toEqual(FIRST_PARTY.map((p) => p.dir).sort());
  });

  it.each(pluginDirs())('%s declares an entrypoint that exists', (dir) => {
    const manifest = manifestOf(dir);
    const frontend = manifest.entrypoints?.frontend;
    expect(frontend, `${dir} must name a frontend entrypoint`).toBeTruthy();
    expect(
      existsSync(join(PLUGIN_ROOT, dir, frontend!)),
      `${dir} declares ${frontend}, which is not on disk`,
    ).toBe(true);
  });

  it.each(pluginDirs())('%s carries the fields the Rust parser requires', (dir) => {
    const manifest = manifestOf(dir);
    for (const field of ['id', 'name', 'version', 'author', 'description'] as const) {
      expect(typeof manifest[field], `${dir}.${field}`).toBe('string');
      expect(manifest[field].length, `${dir}.${field} is empty`).toBeGreaterThan(0);
    }
    expect(Array.isArray(manifest.permissions), `${dir}.permissions`).toBe(true);
  });

  it.each(pluginDirs())('%s asks only for permissions the SDK defines', (dir) => {
    const allowed = sdkPermissions();
    for (const permission of manifestOf(dir).permissions) {
      expect(allowed, `${dir} requests "${permission}"`).toContain(permission);
    }
  });

  it.each(pluginDirs())('%s declares no key the Rust parser ignores', (dir) => {
    const known = rustManifestKeys();
    expect(known.size, 'manager.rs should still declare its fields').toBeGreaterThan(0);
    for (const key of Object.keys(manifestOf(dir))) {
      expect(known, `${dir}/manifest.json has an unread key "${key}"`).toContain(key);
    }
  });

  it('gives every plugin a unique id under the first-party prefix', () => {
    const ids = pluginDirs().map((dir) => manifestOf(dir).id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^io\.blueprint\.official\./);
  });
});

describe('the permission vocabulary', () => {
  /**
   * Which registered command makes each permission meaningful. A permission a
   * manifest can request but no command could ever exercise is a capability
   * claim with nothing behind it, which is how `ui.tab` and `python.execute`
   * ended up in this union.
   */
  const BACKING_COMMANDS: Record<string, string[]> = {
    'fs.read': ['list_project_files', 'get_operating_manuals'],
    'fs.write': ['export_agent_context'],
    'ai.complete': ['generate_ai_completion', 'run_aos_completion'],
    'git.read': ['get_git_status', 'suggest_git_commit_message'],
    'git.write': ['create_git_branch'],
    'network.request': ['analyze_website', 'list_github_repositories'],
  };

  it('does not re-admit permissions for capabilities that were deleted', () => {
    const allowed = sdkPermissions();
    // `ui.tab` and `ui.panel` went with the shell's tab strip and the panel
    // registry that was stored but never rendered; `python.execute` went with
    // the unsandboxed Python runner.
    for (const gone of ['ui.tab', 'ui.panel', 'python.execute']) {
      expect(allowed, `"${gone}" describes something Blueprint cannot do`).not.toContain(gone);
    }
  });

  it('only offers permissions a registered command can exercise', () => {
    const registered = registeredCommands();
    const allowed = sdkPermissions();

    expect([...allowed].sort()).toEqual(Object.keys(BACKING_COMMANDS).sort());
    for (const [permission, commands] of Object.entries(BACKING_COMMANDS)) {
      for (const command of commands) {
        expect(registered, `"${permission}" is backed by ${command}`).toContain(command);
      }
    }
  });
});

describe('first-party plugins', () => {
  it.each(FIRST_PARTY)('$dir registers $command and publishes an intent', ({ Plugin, command }) => {
    const { api, commands, published } = recordingApi();
    const plugin = new Plugin(api);

    expect(plugin).toBeInstanceOf(BlueprintPlugin);
    plugin.activate();

    expect(commands.map((c) => c.id)).toEqual([command]);
    expect(commands[0].label.length).toBeGreaterThan(0);

    // The handler is the whole point: the palette invokes it, so it has to do
    // the one thing a plugin can really do rather than log that it is working.
    commands[0].handler();
    expect(published).toHaveLength(1);
    expect(published[0].event).toMatch(/^[A-Z_]+$/);

    expect(() => plugin.deactivate()).not.toThrow();
  });

  it('registers no command id twice', () => {
    const ids = FIRST_PARTY.flatMap(({ Plugin, command }) => {
      const { api, commands } = recordingApi();
      new Plugin(api).activate();
      expect(commands.map((c) => c.id)).toContain(command);
      return commands.map((c) => c.id);
    });
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the palette registry the command bar reads', () => {
  it('starts empty, because no runtime registers anything yet', () => {
    usePluginStore.setState({ commands: [] });
    expect(usePluginStore.getState().commands).toEqual([]);
  });

  it('holds a registered command and invokes its handler', () => {
    usePluginStore.setState({ commands: [] });
    let invoked = 0;

    usePluginStore.getState().registerCommand('test.command', 'Test: Command', () => {
      invoked += 1;
    });

    const { commands } = usePluginStore.getState();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ id: 'test.command', label: 'Test: Command' });

    commands[0].handler();
    expect(invoked).toBe(1);
  });

  it('keeps every registration, so two plugins cannot shadow each other', () => {
    usePluginStore.setState({ commands: [] });
    const { registerCommand } = usePluginStore.getState();
    registerCommand('a.one', 'A: One', () => {});
    registerCommand('b.two', 'B: Two', () => {});
    expect(usePluginStore.getState().commands.map((c) => c.id)).toEqual(['a.one', 'b.two']);
  });

  it('offers nothing but commands - the dead members stay gone', () => {
    // Through `unknown` because the point is to assert the store exposes nothing
    // else, which no overlap with its declared type can express.
    const state = usePluginStore.getState() as unknown as Record<string, unknown>;
    expect(Object.keys(state).sort()).toEqual(['commands', 'registerCommand']);
  });
});
