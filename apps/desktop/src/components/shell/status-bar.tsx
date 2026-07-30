'use client';

import { Terminal, Github, Activity } from 'lucide-react';

export function StatusBar() {
  return (
    <footer className="h-6 w-full bg-[#141414] border-t border-white/5 flex items-center px-3 justify-between text-[10px] font-mono text-slate-500 uppercase tracking-tight">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 hover:text-white cursor-pointer transition-colors">
          <Activity size={12} className="text-[#00FF9D]" />
          <span>System Ready</span>
        </div>
        <div className="flex items-center space-x-1 hover:text-white cursor-pointer transition-colors">
          <Terminal size={12} />
          <span>Worker: Idle</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 hover:text-white cursor-pointer transition-colors">
          <Github size={12} />
          <span>v0.1.0-alpha</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
          <span>Local Mode</span>
        </div>
      </div>
    </footer>
  );
}
