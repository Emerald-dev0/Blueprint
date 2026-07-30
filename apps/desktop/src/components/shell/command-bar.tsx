'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useWorkspaceStore } from '../../store/workspace';
import {
  Search,
  FolderKanban,
  Settings,
  Terminal,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandBar() {
  const { commandBarOpen, setCommandBarOpen, setActiveSystem } = useWorkspaceStore();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandBarOpen, setCommandBarOpen]);

  return (
    <AnimatePresence>
      {commandBarOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-[640px] bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden shadow-black/50"
          >
            <Command label="Command Palette" onKeyDown={(e) => {
              if (e.key === 'Escape') setCommandBarOpen(false);
            }}>
              <div className="flex items-center border-b border-white/5 px-4">
                <Search size={18} className="text-slate-500" />
                <Command.Input
                  placeholder="Search commands, projects, or intent..."
                  className="w-full bg-transparent py-4 px-3 text-sm text-white outline-none placeholder:text-slate-600 font-mono"
                />
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                <Command.Empty className="py-6 text-center text-sm text-slate-500 font-mono">
                  No matches found.
                </Command.Empty>

                <Command.Group heading="Navigation" className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 py-2">
                  <CommandItem
                    icon={FolderKanban}
                    onSelect={() => { setActiveSystem('projects'); setCommandBarOpen(false); }}
                  >
                    Go to Projects
                  </CommandItem>
                  <CommandItem
                    icon={Cpu}
                    onSelect={() => { setActiveSystem('workspace'); setCommandBarOpen(false); }}
                  >
                    Go to Workspace
                  </CommandItem>
                  <CommandItem
                    icon={Settings}
                    onSelect={() => { setActiveSystem('settings'); setCommandBarOpen(false); }}
                  >
                    Go to Settings
                  </CommandItem>
                </Command.Group>

                <Command.Group heading="System" className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 py-2">
                  <CommandItem icon={Terminal}>Run Diagnostics</CommandItem>
                  <CommandItem icon={ShieldCheck}>Security Audit</CommandItem>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
          <div
            className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setCommandBarOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

function CommandItem({ children, icon: Icon, onSelect }: { children: React.ReactNode; icon: any; onSelect?: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 aria-selected:bg-white/5 aria-selected:text-[#00FF9D] cursor-pointer transition-colors group"
    >
      <Icon size={16} className="text-slate-500 group-aria-selected:text-[#00FF9D]" />
      <span className="font-mono">{children}</span>
    </Command.Item>
  );
}
