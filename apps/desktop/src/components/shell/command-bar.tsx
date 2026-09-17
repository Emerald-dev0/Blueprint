'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Brain,
  Cpu,
  FolderKanban,
  FolderOpen,
  Github,
  History,
  Palette,
  PanelLeft,
  PanelRight,
  Puzzle,
  RefreshCw,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '../../store/workspace';
import { usePluginStore } from '../../store/plugins';
import { isModifierPressed } from '../../lib/platform';
import { pickProjectDirectory } from '../../lib/ipc';
import { ROUTES, type RouteKey } from '../../lib/routes';

/**
 * Command palette (Cmd/Ctrl+K).
 *
 * Every entry does something. The previous palette had five items and only one
 * worked: "New Blueprint Project" had no handler at all (Blueprint does not
 * scaffold repositories), "Open Local Repository" had no handler even though the
 * directory picker exists, "Analyze Project Architecture" opened a tab with a
 * hard-coded `mock-analysis` id and no content, and both navigation entries set
 * a store field instead of navigating - so "Go to Settings" went nowhere.
 *
 * Navigation is driven by the `ROUTES` map, so the palette cannot offer a route
 * that does not exist.
 */
const NAVIGATION: { key: RouteKey; label: string; icon: LucideIcon }[] = [
  { key: 'projects', label: 'Go to Project', icon: FolderKanban },
  { key: 'intelligence', label: 'Go to Intelligence', icon: Brain },
  { key: 'ai', label: 'Go to AI Teammate', icon: Bot },
  { key: 'aos', label: 'Go to Agent OS', icon: Cpu },
  { key: 'github', label: 'Go to GitHub', icon: Github },
  { key: 'memory', label: 'Go to Memory', icon: History },
  { key: 'settings', label: 'Go to Settings', icon: Settings },
  { key: 'designSystem', label: 'Go to Design System', icon: Palette },
];

export function CommandBar() {
  const router = useRouter();
  const {
    commandBarOpen,
    setCommandBarOpen,
    toggleLeftWing,
    toggleRightWing,
    refreshExplorer,
  } = useWorkspaceStore();
  const { commands } = usePluginStore();
  const [isOpening, setIsOpening] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd on macOS, Ctrl on Windows/Linux. Accepting both everywhere would
      // collide with browser/OS shortcuts on the non-primary modifier.
      if (e.key.toLowerCase() === 'k' && isModifierPressed(e)) {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandBarOpen, setCommandBarOpen]);

  const close = () => setCommandBarOpen(false);

  const goTo = (key: RouteKey) => {
    router.push(ROUTES[key]);
    close();
  };

  const openRepository = async () => {
    setIsOpening(true);
    try {
      const chosen = await pickProjectDirectory();
      // The explorer re-walks whenever the nonce changes, including after a
      // cancelled dialog, so the panel stays consistent with the core.
      if (chosen) refreshExplorer();
    } finally {
      setIsOpening(false);
      close();
    }
  };

  return (
    <AnimatePresence>
      {commandBarOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-[640px] overflow-hidden rounded-xl border border-white/10 bg-[#1E1E1E] shadow-2xl shadow-black/50"
          >
            <Command
              label="Command Palette"
              onKeyDown={(e) => {
                if (e.key === 'Escape') close();
              }}
            >
              <div className="flex items-center border-b border-white/5 px-4">
                <Search size={18} className="text-slate-500" />
                <Command.Input
                  placeholder="Search commands..."
                  autoFocus
                  className="w-full bg-transparent px-3 py-4 font-mono text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>

              <Command.List className="max-h-[320px] space-y-1 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center font-mono text-sm text-slate-500">
                  No matches found.
                </Command.Empty>

                {commands.length > 0 && (
                  <Command.Group heading="Extensions" className={groupClass}>
                    {commands.map((cmd) => (
                      <CommandItem
                        key={cmd.id}
                        icon={Puzzle}
                        onSelect={() => {
                          cmd.handler();
                          close();
                        }}
                      >
                        {cmd.label}
                      </CommandItem>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Project" className={groupClass}>
                  <CommandItem icon={FolderOpen} onSelect={openRepository} disabled={isOpening}>
                    {isOpening ? 'Waiting for the directory picker...' : 'Open Local Repository'}
                  </CommandItem>
                  <CommandItem
                    icon={RefreshCw}
                    onSelect={() => {
                      refreshExplorer();
                      close();
                    }}
                  >
                    Refresh File Tree
                  </CommandItem>
                </Command.Group>

                <Command.Group heading="Panels" className={groupClass}>
                  <CommandItem
                    icon={PanelLeft}
                    onSelect={() => {
                      toggleLeftWing();
                      close();
                    }}
                  >
                    Toggle Explorer Panel
                  </CommandItem>
                  <CommandItem
                    icon={PanelRight}
                    onSelect={() => {
                      toggleRightWing();
                      close();
                    }}
                  >
                    Toggle Inspector Panel
                  </CommandItem>
                </Command.Group>

                <Command.Group heading="Navigation" className={groupClass}>
                  {NAVIGATION.map((item) => (
                    <CommandItem key={item.key} icon={item.icon} onSelect={() => goTo(item.key)}>
                      {item.label}
                    </CommandItem>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
          <div className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[2px]" onClick={close} />
        </div>
      )}
    </AnimatePresence>
  );
}

const groupClass =
  'px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-500';

function CommandItem({
  children,
  icon: Icon,
  onSelect,
  disabled,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      disabled={disabled}
      className="group flex cursor-pointer items-center space-x-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors aria-selected:bg-white/5 aria-selected:text-[#00FF9D] data-[disabled=true]:cursor-default data-[disabled=true]:opacity-50"
    >
      <Icon size={16} className="text-slate-500 group-aria-selected:text-[#00FF9D]" />
      <span className="font-mono">{children}</span>
    </Command.Item>
  );
}
