import { create } from 'zustand';

/**
 * Host-side registry for plugin-provided palette commands.
 *
 * `commands` is the only part of the plugin surface wired end to end: the
 * command palette renders these entries and invokes their handlers. Nothing
 * populates it yet, because no plugin runtime exists to call `registerCommand`
 * - see the header of `@blueprint/plugin-sdk`, which states that plainly rather
 * than implying the four first-party plugins run.
 *
 * Removed as dead: `plugins` and `initialize()` (Settings reads installed
 * manifests straight from the Rust plugin manager, and `initialize` - the only
 * thing that ever filled this array - was never called by any component),
 * `registerPlugin`, and `panels` / `registerPanel` (stored, never rendered).
 */
interface PluginCommand {
  id: string;
  label: string;
  handler: () => void;
}

interface PluginState {
  commands: PluginCommand[];
  registerCommand: (id: string, label: string, handler: () => void) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  commands: [],

  registerCommand: (id, label, handler) =>
    set((state) => ({ commands: [...state.commands, { id, label, handler }] })),
}));
