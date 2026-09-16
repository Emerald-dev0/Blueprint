'use client';

import * as React from 'react';
import { FolderOpen, Github, ShieldCheck } from 'lucide-react';
import { getPlatform } from '../../lib/platform';
import { api } from '../../lib/ipc';

const PLATFORM_LABEL: Record<string, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  unknown: 'Desktop',
};

/**
 * Honest status strip.
 *
 * The previous version reported "System Ready" and "Worker: Idle" unconditionally;
 * there is no background worker, so the indicator described a subsystem that does
 * not exist. It now reports things that are actually true and observable: the OS
 * the app is running on, and which repository (if any) is open.
 */
export function StatusBar() {
  const [projectPath, setProjectPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    api
      .getProjectPath()
      .then((p) => !cancelled && setProjectPath(p))
      .catch(() => !cancelled && setProjectPath(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const platform = PLATFORM_LABEL[getPlatform()] ?? 'Desktop';
  const projectName = projectPath
    ? projectPath.split(/[/\\]/).filter(Boolean).pop() ?? projectPath
    : null;

  return (
    <footer className="h-6 w-full bg-[#141414] border-t border-white/5 flex items-center px-3 justify-between text-[10px] font-mono text-slate-500 uppercase tracking-tight">
      <div className="flex items-center space-x-4 min-w-0">
        <div className="flex items-center space-x-1">
          <ShieldCheck size={12} className="text-[#00FF9D]" />
          <span>Local-first</span>
        </div>
        <div className="flex items-center space-x-1 truncate">
          <FolderOpen size={12} />
          <span className="truncate" title={projectPath ?? undefined}>
            {projectName ? `Open: ${projectName}` : 'No project open'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <span>{platform}</span>
        <div className="flex items-center space-x-1">
          <Github size={12} />
          <span>v0.1.0-alpha</span>
        </div>
      </div>
    </footer>
  );
}
