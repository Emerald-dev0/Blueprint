'use client';

import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../../store/workspace';
import { ProjectExplorer } from '../workspace/explorer';
import { Inspector } from '../workspace/inspector';

/**
 * The three-column shell: explorer, routed page, inspector.
 *
 * The tab strip that used to sit above the page is gone. Its tabs were stored
 * and rendered as chips, but no code ever drew a tab's contents, so activating
 * one changed a highlight and nothing else - and one command in the palette
 * created a tab called `mock-analysis` that persisted into localStorage.
 * Blueprint navigates by route; the columns either show real state or say they
 * have none.
 */
export function Workspace({ children }: { children: React.ReactNode }) {
  const { leftWingOpen, rightWingOpen, layout, setLayout } = useWorkspaceStore();

  return (
    <PanelGroup
      direction="horizontal"
      className="flex-grow overflow-hidden"
      onLayout={(sizes: number[]) => {
        if (sizes.length === 3) {
          setLayout({
            leftWingWidth: sizes[0],
            rightWingWidth: sizes[2],
          });
        }
      }}
    >
      {leftWingOpen && (
        <Panel defaultSize={layout.leftWingWidth} minSize={15} maxSize={40} id="explorer">
          <div className="h-full overflow-hidden border-r border-white/5 bg-[#0B0B0B]">
            <ProjectExplorer />
          </div>
        </Panel>
      )}

      {leftWingOpen && <ResizeHandle />}

      <Panel minSize={30}>
        <main className="relative h-full flex-grow overflow-auto bg-[#0B0B0B]">{children}</main>
      </Panel>

      {rightWingOpen && <ResizeHandle />}

      {rightWingOpen && (
        <Panel defaultSize={layout.rightWingWidth} minSize={20} maxSize={50} id="inspector">
          <div className="h-full overflow-hidden border-l border-white/5 bg-[#0B0B0B]">
            <Inspector />
          </div>
        </Panel>
      )}
    </PanelGroup>
  );
}

function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative w-[1px] bg-white/5 transition-colors hover:bg-[#00FF9D]/30">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10 cursor-col-resize" />
    </PanelResizeHandle>
  );
}
