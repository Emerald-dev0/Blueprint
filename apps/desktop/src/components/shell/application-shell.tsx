'use client';

import { NavigationRail } from './navigation-rail';
import { Workspace } from './workspace';
import { StatusBar } from './status-bar';
import { CommandBar } from './command-bar';
import { useWorkspaceStore } from '../../store/workspace';
import { LayoutGrid, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Application chrome.
 *
 * A `useEffect` here previously registered a hard-coded "React Intelligence"
 * plugin into the store on every mount, which is why Settings → Installed
 * always showed a plugin that was never installed and whose `index.js`
 * entrypoint does not exist. Installed plugins are now read from the Rust
 * plugin manager in Settings, and extension-provided commands arrive through
 * the plugin runtime once it exists.
 */
export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const { toggleLeftWing, toggleRightWing, leftWingOpen, rightWingOpen } = useWorkspaceStore();

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0B0B0B] text-white">
      <header className="h-10 w-full bg-[#0B0B0B] border-b border-white/5 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-[#00FF9D] rounded-sm flex items-center justify-center">
            <LayoutGrid size={12} className="text-black" />
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
            Blueprint
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleLeftWing}
            aria-pressed={leftWingOpen}
            aria-label="Toggle explorer panel"
            className={cn(
              'p-1.5 rounded hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF9D]/60',
              leftWingOpen ? 'text-[#00FF9D]' : 'text-slate-500',
            )}
          >
            <PanelLeft size={16} />
          </button>
          <button
            onClick={toggleRightWing}
            aria-pressed={rightWingOpen}
            aria-label="Toggle inspector panel"
            className={cn(
              'p-1.5 rounded hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-[#00FF9D]/60',
              rightWingOpen ? 'text-[#00FF9D]' : 'text-slate-500',
            )}
          >
            <PanelRight size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        <NavigationRail />
        <Workspace>{children}</Workspace>
      </div>
      <StatusBar />
      <CommandBar />
    </div>
  );
}
