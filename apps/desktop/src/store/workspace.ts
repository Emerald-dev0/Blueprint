import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Shell layout state: which wings are open, how wide they are, and what the
 * explorer has selected.
 *
 * Three things were removed because they duplicated state that lives elsewhere
 * and had already drifted from it:
 *
 * - `activeSystem` claimed to track the current page, but only the command bar
 *   ever set it, so it said "projects" on every route. The navigation rail
 *   derives the active entry from `usePathname()`; the router is the only
 *   source of truth for where the user is.
 * - `tabs` / `activeTabId` backed a tab strip whose contents were never
 *   rendered - clicking a tab highlighted a chip and nothing else. Blueprint is
 *   route-based, so the strip was decoration that implied a capability (an
 *   in-app editor with open documents) that does not exist.
 * - `activeProjectId` competed with the Rust `ProjectContext`, which is what
 *   every command actually reads. Nothing ever set it.
 */

/** The explorer entry mirrored into the inspector panel. */
export interface ExplorerSelection {
  name: string;
  /** Relative to the open project root, `/`-separated. */
  path: string;
  kind: 'file' | 'directory';
}

interface WorkspaceState {
  leftWingOpen: boolean;
  rightWingOpen: boolean;
  commandBarOpen: boolean;
  selection: ExplorerSelection | null;
  /** Bumped to ask the explorer to walk the project again. */
  explorerNonce: number;
  layout: {
    leftWingWidth: number;
    rightWingWidth: number;
  };

  toggleLeftWing: () => void;
  toggleRightWing: () => void;
  setCommandBarOpen: (open: boolean) => void;
  select: (selection: ExplorerSelection | null) => void;
  refreshExplorer: () => void;
  setLayout: (layout: Partial<WorkspaceState['layout']>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      leftWingOpen: true,
      rightWingOpen: false,
      commandBarOpen: false,
      selection: null,
      explorerNonce: 0,
      layout: {
        leftWingWidth: 20,
        rightWingWidth: 25,
      },

      toggleLeftWing: () => set((state) => ({ leftWingOpen: !state.leftWingOpen })),
      toggleRightWing: () => set((state) => ({ rightWingOpen: !state.rightWingOpen })),
      setCommandBarOpen: (open) => set({ commandBarOpen: open }),
      select: (selection) => set({ selection }),
      refreshExplorer: () =>
        set((state) => ({ explorerNonce: state.explorerNonce + 1 })),
      setLayout: (layout) =>
        set((state) => ({
          layout: { ...state.layout, ...layout },
        })),
    }),
    {
      name: 'blueprint-workspace-storage',
      storage: createJSONStorage(() => localStorage),
      // Only the layout is worth restoring across launches. What was selected
      // and when the tree was last refreshed belong to the session, and the
      // selection refers to a project that may not be open any more.
      partialize: (state) => ({
        leftWingOpen: state.leftWingOpen,
        rightWingOpen: state.rightWingOpen,
        layout: state.layout,
      }),
    }
  )
);
