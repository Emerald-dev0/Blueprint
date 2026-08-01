'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@blueprint/ui';
import {
  FolderKanban,
  Cpu,
  Brain,
  Bot,
  Github,
  History,
  Settings
} from 'lucide-react';

const navItems = [
  { id: 'projects', icon: FolderKanban, label: 'Projects', href: '/' },
  { id: 'workspace', icon: Cpu, label: 'Workspace', href: '/workspace' },
  { id: 'intelligence', icon: Brain, label: 'Intelligence', href: '/intelligence' },
  { id: 'ai', icon: Bot, label: 'AI Teammate', href: '/ai' },
  { id: 'github', icon: Github, label: 'GitHub', href: '/github' },
  { id: 'memory', icon: History, label: 'Memory', href: '/memory' },
] as const;

export function NavigationRail() {
  const pathname = usePathname();

  return (
    <nav className="w-16 h-full flex flex-col items-center py-4 bg-surface-1 border-r border-white/5 space-y-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.id === 'projects' && pathname === '/');
        return (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={isActive}
            asChild
          >
            <Link href={item.href} />
          </NavItem>
        );
      })}

      <div className="flex-grow" />

      <NavItem
        icon={Settings}
        label="Settings"
        isActive={pathname === '/settings'}
        asChild
      >
        <Link href="/settings" />
      </NavItem>
    </nav>
  );
}
