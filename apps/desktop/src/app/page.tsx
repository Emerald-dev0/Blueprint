'use client';

import { useWorkspaceStore } from '../store/workspace';

export default function Home() {
  const { activeSystem } = useWorkspaceStore();

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center space-y-6">
      <div className="p-12 border border-white/5 rounded-2xl bg-[#141414]/50 backdrop-blur-sm flex flex-col items-center space-y-4 max-w-lg text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#00FF9D]">
          {activeSystem.toUpperCase()}
        </h2>
        <p className="text-slate-400 font-mono text-sm leading-relaxed">
          The {activeSystem} engine is currently in development.
          Press <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white">Cmd + K</kbd> to explore available commands.
        </p>
      </div>
    </div>
  );
}
