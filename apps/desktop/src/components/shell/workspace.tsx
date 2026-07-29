'use client';

import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../../store/workspace';
import { ProjectExplorer } from '../workspace/explorer';
import { WorkspaceTabs } from '../workspace/tabs';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';

export function Workspace({ children }: { children: React.ReactNode }) {
  const {
    leftWingOpen,
    rightWingOpen,
    layout,
    setLayout,
    tabs,
    activeSystem
  } = useWorkspaceStore();

  const isWorkspaceActive = activeSystem === 'workspace';

  return (
    <PanelGroup
      direction="horizontal"
      className="flex-grow overflow-hidden"
      onLayout={(sizes) => {
        if (sizes.length === 3) {
          setLayout({
            leftWingWidth: sizes[0],
            rightWingWidth: sizes[2]
          });
        }
      }}
    >
      {/* Left Wing */}
      {leftWingOpen && (
        <Panel defaultSize={layout.leftWingWidth} minSize={15} maxSize={40} id="explorer">
          <div className="h-full bg-[#0B0B0B] border-r border-white/5 overflow-hidden">
            <ProjectExplorer />
          </div>
        </Panel>
      )}

      {leftWingOpen && <ResizeHandle />}

      {/* Main Workspace */}
      <Panel minSize={30}>
        <div className="flex flex-col h-full bg-[#0B0B0B]">
          {isWorkspaceActive && <WorkspaceTabs />}
          <main className="flex-grow relative overflow-auto">
            {isWorkspaceActive && tabs.length === 0 ? (
              <EmptyWorkspace />
            ) : (
              <div className="h-full">
                {children}
              </div>
            )}
          </main>
        </div>
      </Panel>

      {rightWingOpen && <ResizeHandle />}

      {/* Right Wing */}
      {rightWingOpen && (
        <Panel defaultSize={layout.rightWingWidth} minSize={20} maxSize={50} id="inspector">
          <div className="h-full bg-[#0B0B0B] border-l border-white/5 overflow-hidden">
            <div className="p-4 text-xs font-mono text-slate-500 uppercase tracking-widest text-right">
              Inspector
            </div>
          </div>
        </Panel>
      )}
    </PanelGroup>
  );
}

function ResizeHandle() {
  return (
    <PanelResizeHandle className="w-[1px] bg-white/5 hover:bg-[#00FF9D]/30 transition-colors relative group">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10 cursor-col-resize" />
    </PanelResizeHandle>
  );
}

function EmptyWorkspace() {
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-[#00FF9D]/20">
        <Cpu size={32} />
      </div>
      <div className="max-w-md">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-tight">Workspace Ready</h3>
        <p className="text-xs text-slate-500 font-mono mt-2 leading-relaxed">
          Open a file from the explorer or use <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5">Cmd+K</kbd> to initiate an implementation plan.
        </p>
      </div>
    </div>
  );
}
