import { create } from 'zustand';

interface WorkspaceState {
  activeProjectId: string | null;
  leftWingOpen: boolean;
  rightWingOpen: boolean;
  commandBarOpen: boolean;
  activeSystem: 'projects' | 'workspace' | 'intelligence' | 'ai' | 'github' | 'memory' | 'settings';

  setActiveProject: (id: string | null) => void;
  toggleLeftWing: () => void;
  toggleRightWing: () => void;
  setCommandBarOpen: (open: boolean) => void;
  setActiveSystem: (system: WorkspaceState['activeSystem']) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId: null,
  leftWingOpen: true,
  rightWingOpen: false,
  commandBarOpen: false,
  activeSystem: 'projects',

  setActiveProject: (id) => set({ activeProjectId: id }),
  toggleLeftWing: () => set((state) => ({ leftWingOpen: !state.leftWingOpen })),
  toggleRightWing: () => set((state) => ({ rightWingOpen: !state.rightWingOpen })),
  setCommandBarOpen: (open) => set({ commandBarOpen: open }),
  setActiveSystem: (system) => set({ activeSystem: system }),
}));
