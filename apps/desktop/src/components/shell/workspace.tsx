'use client';

import { useWorkspaceStore } from '../../store/workspace';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Workspace({ children }: { children: React.ReactNode }) {
  const { leftWingOpen, rightWingOpen } = useWorkspaceStore();

  return (
    <div className="flex-grow flex overflow-hidden">
      {/* Left Wing (Explorer) */}
      <AnimatePresence initial={false}>
        {leftWingOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full bg-[#0B0B0B] border-r border-white/5 overflow-hidden flex-shrink-0"
          >
            <div className="w-[240px] p-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
              Explorer
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow bg-[#0B0B0B] relative overflow-auto">
        {children}
      </main>

      {/* Right Wing (Inspector/AI) */}
      <AnimatePresence initial={false}>
        {rightWingOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full bg-[#0B0B0B] border-l border-white/5 overflow-hidden flex-shrink-0"
          >
            <div className="w-[320px] p-4 text-xs font-mono text-slate-500 uppercase tracking-widest text-right">
              Inspector
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
