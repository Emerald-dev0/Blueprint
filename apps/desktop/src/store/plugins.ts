import { create } from 'zustand';
import { PluginManifest } from '@blueprint/plugin-sdk';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface PluginState {
  plugins: PluginManifest[];
  commands: { id: string; label: string; handler: () => void }[];
  panels: Record<string, any>;

  initialize: () => Promise<void>;
  registerPlugin: (manifest: PluginManifest) => void;
  registerCommand: (id: string, label: string, handler: () => void) => void;
  registerPanel: (id: string, component: any) => void;
  publishEvent: (type: string, data: any) => Promise<void>;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: [],
  commands: [],
  panels: {},

  initialize: async () => {
    // Listen for system events from Rust
    await listen('system-event', (event: any) => {
      console.log('System Event Received:', event.payload);
      // Notify interested plugins (logic to be expanded)
    });

    try {
      const installed = await invoke<PluginManifest[]>('list_installed_plugins');
      set({ plugins: installed });
    } catch (e) {
      console.error('Failed to load plugins:', e);
    }
  },

  registerPlugin: (manifest) => set((state) => ({
    plugins: [...state.plugins, manifest]
  })),

  registerCommand: (id, label, handler) => set((state) => ({
    commands: [...state.commands, { id, label, handler }]
  })),

  registerPanel: (id, component) => set((state) => ({
    panels: { ...state.panels, [id]: component }
  })),

  publishEvent: async (type, payload) => {
    await invoke('publish_system_event', { eventType: type, payload });
  }
}));
