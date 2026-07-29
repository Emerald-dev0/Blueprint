import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WorkspaceTabType = 'analysis' | 'ai' | 'browser' | 'editor' | 'github';

export interface WorkspaceTab {
  id: string;
  type: WorkspaceTabType;
  title: string;
  metadata?: Record<string, any>;
}

interface WorkspaceState {
  activeProjectId: string | null;
  leftWingOpen: boolean;
  rightWingOpen: boolean;
  commandBarOpen: boolean;
  activeSystem: 'projects' | 'workspace' | 'intelligence' | 'ai' | 'github' | 'memory' | 'settings';

  // Tab System
  tabs: WorkspaceTab[];
  activeTabId: string | null;

  // Layout State
  layout: {
    leftWingWidth: number;
    rightWingWidth: number;
  };

  setActiveProject: (id: string | null) => void;
  toggleLeftWing: () => void;
  toggleRightWing: () => void;
  setCommandBarOpen: (open: boolean) => void;
  setActiveSystem: (system: WorkspaceState['activeSystem']) => void;

  // Tab Actions
  openTab: (tab: WorkspaceTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Layout Actions
  setLayout: (layout: Partial<WorkspaceState['layout']>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      leftWingOpen: true,
      rightWingOpen: false,
      commandBarOpen: false,
      activeSystem: 'projects',
      tabs: [],
      activeTabId: null,
      layout: {
        leftWingWidth: 20,
        rightWingWidth: 25,
      },

      setActiveProject: (id) => set({ activeProjectId: id }),
      toggleLeftWing: () => set((state) => ({ leftWingOpen: !state.leftWingOpen })),
      toggleRightWing: () => set((state) => ({ rightWingOpen: !state.rightWingOpen })),
      setCommandBarOpen: (open) => set({ commandBarOpen: open }),
      setActiveSystem: (system) => set({ activeSystem: system }),

      openTab: (tab) => set((state) => {
        const exists = state.tabs.find(t => t.id === tab.id);
        if (exists) return { activeTabId: tab.id, activeSystem: 'workspace' };
        return {
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
          activeSystem: 'workspace'
        };
      }),

      closeTab: (id) => set((state) => {
        const newTabs = state.tabs.filter(t => t.id !== id);
        let newActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }
        return { tabs: newTabs, activeTabId: newActiveId };
      }),

      setActiveTab: (id) => set({ activeTabId: id, activeSystem: 'workspace' }),

      setLayout: (layout) => set((state) => ({
        layout: { ...state.layout, ...layout }
      })),
    }),
    {
      name: 'blueprint-workspace-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        leftWingOpen: state.leftWingOpen,
        rightWingOpen: state.rightWingOpen,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        layout: state.layout,
      }),
    }
  )
);
