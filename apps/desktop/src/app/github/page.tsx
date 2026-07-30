'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Badge,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@blueprint/ui';
import {
  Github,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Activity,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { GitHubRepository } from '@blueprint/types';

export default function GitHubPage() {
  const [repos, setRepos] = React.useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);

  const fetchRepos = async () => {
    setIsLoading(true);
    try {
      const res: any[] = await invoke('list_github_repositories');
      setRepos(res.map(r => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        url: r.url,
        isPrivate: r.private,
        language: r.language,
        stars: r.stars,
        updatedAt: r.updated_at
      })));
      setIsConnected(true);
    } catch (e) {
      console.error(e);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic text-mint">GitHub Ecosystem</h1>
          <p className="text-xs text-slate-500 font-mono">Orchestrate your repositories, issues, and deployment cycles.</p>
        </div>
        {isConnected ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Connected</span>
          </div>
        ) : (
          <Button onClick={fetchRepos} disabled={isLoading} variant="primary" size="sm">Connect GitHub</Button>
        )}
      </header>

      {!isConnected && !isLoading ? (
        <div className="p-24 border border-dashed border-white/5 rounded-3xl bg-surface-1/50 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-600">
            <Github size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Autonomous Workflow Foundation</h3>
            <p className="text-xs text-slate-500 font-mono max-w-md mx-auto leading-relaxed">
              Connect your GitHub account to enable AI-powered issue management, branch strategy recommendations, and automated PR generation.
            </p>
          </div>
          <Button onClick={fetchRepos} variant="primary" className="px-8">Get Started</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <Input placeholder="Search your repositories..." className="pl-10 bg-surface-1 border-white/5 h-12" />
            </div>

            <div className="grid gap-4">
              {repos.length === 0 && isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                ))
              ) : (
                repos.map(repo => (
                  <RepoCard key={repo.id} repo={repo} />
                ))
              )}
            </div>
          </div>

          <aside className="space-y-8">
            <section className="p-6 bg-surface-1 border border-white/5 rounded-2xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Engineering Velocity</h4>
              <div className="space-y-6">
                <VelocityItem label="Open PRs" value="12" icon={GitPullRequest} color="text-blue-500" />
                <VelocityItem label="Build Success" value="98%" icon={Activity} color="text-mint" />
                <VelocityItem label="Avg Review Time" value="4.2h" icon={MessageSquare} color="text-amber-500" />
              </div>
            </section>

            <section className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-4">
               <div className="flex items-center space-x-2 text-mint">
                 <ShieldCheck size={16} />
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Security Guard</h4>
               </div>
               <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                 Blueprint is monitoring 5 repositories for secret exposure and dependency vulnerabilities.
               </p>
               <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] uppercase font-bold border border-white/5">Run Full Audit</Button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: GitHubRepository }) {
  return (
    <div className="group p-5 bg-surface-1 border border-white/5 rounded-2xl hover:border-mint/30 transition-all flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="p-2.5 rounded-xl bg-white/5 text-slate-500 group-hover:text-mint transition-colors">
          <Github size={20} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-white tracking-tight">{repo.name}</h4>
            {repo.isPrivate && <Badge variant="outline" className="text-[8px] px-1 py-0 border-white/10 text-slate-600">Private</Badge>}
          </div>
          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[300px]">{repo.description || 'No description provided.'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-600 font-mono uppercase">Last Sync</span>
          <span className="text-[10px] text-slate-400 font-mono">{new Date(repo.updatedAt).toLocaleDateString()}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-white">
          <ExternalLink size={14} />
        </Button>
      </div>
    </div>
  );
}

function VelocityItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={cn("p-1.5 rounded-lg bg-white/5", color)}>
          <Icon size={14} />
        </div>
        <span className="text-xs text-slate-400 font-mono uppercase tracking-tighter">{label}</span>
      </div>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}

import { cn } from '@/lib/utils';
