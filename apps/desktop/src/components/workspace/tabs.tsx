'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import { X, Cpu, Brain, Bot, FileText, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const tabIcons = {
  analysis: Layout,
  ai: Bot,
  browser: Brain,
  editor: FileText,
  github: Cpu,
};

export function WorkspaceTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkspaceStore();

  if (tabs.length === 0) return null;

  return (
    <div className="h-9 w-full bg-surface-1 border-b border-white/5 flex items-center overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const Icon = tabIcons[tab.type];
        const isActive = activeTabId === tab.id;

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center h-full px-4 border-r border-white/5 cursor-pointer transition-all relative min-w-[120px] max-w-[200px] group",
              isActive ? "bg-ink text-mint" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
            )}
          >
            <Icon size={14} className="mr-2 flex-shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-tight truncate flex-grow">
              {tab.title}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-2 p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>

            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute top-0 left-0 w-full h-0.5 bg-mint"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
