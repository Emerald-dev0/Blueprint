'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@blueprint/ui';
import {
  FolderKanban,
  Brain,
  Bot,
  Github,
  History,
  Settings,
} from 'lucide-react';
import { ROUTES } from '../../lib/routes';
import { normalizePath } from '../../lib/platform';

const primaryNav = [
  { id: 'projects', icon: FolderKanban, label: 'Project', href: ROUTES.projects },
  { id: 'intelligence', icon: Brain, label: 'Intelligence', href: ROUTES.intelligence },
  { id: 'ai', icon: Bot, label: 'AI Teammate', href: ROUTES.ai },
  { id: 'github', icon: Github, label: 'GitHub', href: ROUTES.github },
  { id: 'memory', icon: History, label: 'Memory', href: ROUTES.memory },
] as const;

export function NavigationRail() {
  // `trailingSlash: true` makes Next report "/ai/" inside the packaged app, so
  // raw comparison against "/ai" would clear every active state on Windows and
  // Linux while still looking correct in `next dev`.
  const pathname = normalizePath(usePathname());

  const isActive = (href: string) => {
    if (href === ROUTES.projects) return pathname === ROUTES.projects;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Primary"
      className="w-16 h-full flex flex-col items-center py-4 bg-[#141414] border-r border-white/5 space-y-4"
    >
      {primaryNav.map((item) => (
        <NavItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          isActive={isActive(item.href)}
          asChild
        >
          <Link href={item.href} />
        </NavItem>
      ))}

      <div className="flex-grow" />

      <NavItem
        icon={Settings}
        label="Settings"
        isActive={isActive(ROUTES.settings)}
        asChild
      >
        <Link href={ROUTES.settings} />
      </NavItem>
    </nav>
  );
}
