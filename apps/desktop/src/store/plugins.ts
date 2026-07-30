import { create } from 'zustand';
import { PluginManifest } from '@blueprint/plugin-sdk';

interface PluginState {
  plugins: PluginManifest[];
  commands: { id: string; label: string; handler: () => void }[];

  registerPlugin: (manifest: PluginManifest) => void;
  registerCommand: (command: { id: string; label: string; handler: () => void }) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: [],
  commands: [],

  registerPlugin: (manifest) => set((state) => ({
    plugins: [...state.plugins, manifest]
  })),

  registerCommand: (command) => set((state) => ({
    commands: [...state.commands, command]
  })),
}));
