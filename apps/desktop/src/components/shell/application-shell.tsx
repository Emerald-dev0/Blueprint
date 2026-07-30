'use client';

import { NavigationRail } from './navigation-rail';
import { Workspace } from './workspace';
import { StatusBar } from './status-bar';
import { CommandBar } from './command-bar';
import { useWorkspaceStore } from '../../store/workspace';
import { usePluginStore } from '../../store/plugins';
import { LayoutGrid, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const { toggleLeftWing, toggleRightWing, leftWingOpen, rightWingOpen } = useWorkspaceStore();
  const { registerPlugin, registerCommand } = usePluginStore();

  useEffect(() => {
    // Simulate loading a React Intelligence plugin
    registerPlugin({
      id: 'io.blueprint.react-intel',
      name: 'React Intelligence',
      version: '1.0.0',
      author: 'Blueprint Team',
      description: 'Provides deep analysis of React component trees.',
      permissions: ['fs.read']
    });

    registerCommand({
      id: 'react-intel-scan',
      label: 'React: Scan Component Tree',
      handler: () => console.log("Scanning React components...")
    });
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0B0B0B] text-white">
      <header className="h-10 w-full bg-[#0B0B0B] border-b border-white/5 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-[#00FF9D] rounded-sm flex items-center justify-center">
            <LayoutGrid size={12} className="text-black" />
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">Blueprint</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleLeftWing}
            className={cn(
              "p-1.5 rounded hover:bg-white/5 transition-colors",
              leftWingOpen ? "text-[#00FF9D]" : "text-slate-500"
            )}
          >
            <PanelLeft size={16} />
          </button>
          <button
            onClick={toggleRightWing}
            className={cn(
              "p-1.5 rounded hover:bg-white/5 transition-colors",
              rightWingOpen ? "text-[#00FF9D]" : "text-slate-500"
            )}
          >
            <PanelRight size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        <NavigationRail />
        <Workspace>
          {children}
        </Workspace>
      </div>
      <StatusBar />
      <CommandBar />
    </div>
  );
}
