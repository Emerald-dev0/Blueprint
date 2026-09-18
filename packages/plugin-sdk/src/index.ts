/**
 * The contract between Blueprint and a plugin.
 *
 * Read this before assuming any of it works. **No host constructs
 * `BlueprintAPI` yet.** The Rust core discovers `manifest.json` files in the
 * per-user plugin directory and the Settings page lists what it finds; nothing
 * imports, instantiates or activates plugin code. So a plugin written against
 * these types is scaffolding for the runtime on the roadmap, not a feature.
 *
 * The surface is limited to what a host could actually deliver today, because
 * every member that could not was a promise with nothing behind it:
 *
 * - `registerCommand` is the one capability that is real end to end: the app's
 *   plugin store holds registered commands and the command palette renders and
 *   invokes them.
 * - `events` is a working mechanism with no traffic: `publish_system_event`
 *   emits a `system-event` Tauri event and `listen('system-event')` receives it,
 *   but no Rust module publishes and no part of the app subscribes today.
 * - `workspace.openTab` / `closeTab` were removed with the shell's tab system,
 *   which rendered tab chips whose contents nothing ever drew.
 * - `workspace.toggleWing` was kept only as long as it had a host action; the
 *   panels themselves show real state now, so a plugin toggling them is not
 *   something the app needs to offer.
 * - `AIAPI` and `GitHubAPI` were removed entirely: `ai.complete` claimed to
 *   return a string when the core returns an object, `ai.registerPersona`
 *   described registration for personas that are files on disk, and
 *   `github.createIssue` invoked a command that does not exist. Plugins that
 *   need the AI or git surfaces should go through the typed command wrappers
 *   once a runtime exists to hand them over.
 * - `registerPanel` was removed because `panels` were stored and never
 *   rendered.
 */

/**
 * Permissions a manifest may request. They are metadata: the Settings page
 * shows them to the user, and a future runtime would enforce them.
 *
 * `ui.tab` and `ui.panel` went with the tab strip and the unrendered panel
 * registry; `python.execute` went with the unsandboxed Python runner (the
 * roadmap wants a sandboxed one, which will bring its own permission).
 */
export type Permission =
  'fs.read' | 'fs.write' | 'ai.complete' | 'git.read' | 'git.write' | 'network.request';

/**
 * Mirrors the Rust `PluginManifest` in `src/plugins/manager.rs`, which is what
 * actually parses these files. Optional fields are optional there too, so a
 * manifest that omits them still loads.
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: Permission[];
  minBlueprintVersion?: string | null;
  entrypoints?: {
    frontend?: string;
    backend?: string;
  };
}

/**
 * Outbound goes through the `publish_system_event` command; inbound through the
 * `system-event` Tauri event. Both halves work, and neither currently has a
 * participant - see the header.
 */
export interface EventBus {
  subscribe: (event: string, callback: (data: unknown) => void) => void;
  publish: (event: string, data: unknown) => void;
}

export interface BlueprintAPI {
  events: EventBus;
  /** Registers an entry in the command palette, which invokes `handler`. */
  registerCommand: (id: string, label: string, handler: () => void) => void;
}

export abstract class BlueprintPlugin {
  constructor(protected api: BlueprintAPI) {}

  abstract activate(): void;

  abstract deactivate(): void;
}
