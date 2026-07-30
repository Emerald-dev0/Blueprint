'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea
} from '@blueprint/ui';
import {
  History,
  Search,
  Plus,
  Brain,
  ChevronRight,
  BookOpen,
  User,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { MemoryEntry, ADR } from '@blueprint/types';

type LoadState = 'loading' | 'ready' | 'error';

export default function MemoryPage() {
  const [adrs, setAdrs] = React.useState<ADR[]>([]);
  const [adrState, setAdrState] = React.useState<LoadState>('loading');
  const [adrError, setAdrError] = React.useState<string | null>(null);

  const [memories, setMemories] = React.useState<MemoryEntry[]>([]);
  const [search, setSearch] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);

  const fetchADRs = React.useCallback(async () => {
    setAdrState('loading');
    setAdrError(null);
    try {
      const res: ADR[] = await invoke('get_adrs', { projectId: 'default' });
      setAdrs(res);
      setAdrState('ready');
    } catch (e) {
      setAdrError(String(e));
      setAdrState('error');
    }
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) {
      setMemories([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const res: MemoryEntry[] = await invoke('search_memory', {
        projectId: 'default',
        query: search
      });
      setMemories(res);
    } catch (e) {
      setMemories([]);
      setSearchError(String(e));
    } finally {
      setHasSearched(true);
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    fetchADRs();
  }, [fetchADRs]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Institutional Memory</h1>
          <p className="text-xs text-slate-500 font-mono">Capture decisions, reasoning, and system evolution.</p>
        </div>

        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white/5 bg-white/5">
                <Brain size={16} className="mr-2" />
                Add Knowledge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Store Project Knowledge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Key (e.g. auth-logic)" />
                <Textarea placeholder="Describe the pattern or knowledge..." className="min-h-[100px]" />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" className="w-full">Ingest Memory</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">
                <Plus size={16} className="mr-2" />
                New ADR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Architecture Decision Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Decision Title (e.g. choice of database)" />
                <Textarea placeholder="Context: What problem are we solving?" className="min-h-[80px]" />
                <Textarea placeholder="Decision: What is the solution?" className="min-h-[80px]" />
                <Textarea placeholder="Consequences: What happens next?" className="min-h-[60px]" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="primary" className="w-full text-black">Seal Decision</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search through decisions, constraints, and intent..."
          className="pl-12 bg-[#141414] border-white/5 h-14 text-base focus-visible:ring-[#00FF9D]/30"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {isSearching ? (
            <span className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-slate-500">
              <Loader2 size={12} className="animate-spin" />
              Searching
            </span>
          ) : (
            <Badge variant="outline" className="font-mono text-[9px]">Press Enter</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="decisions" className="w-full">
        <TabsList className="bg-transparent border-b border-white/5 rounded-none p-0 h-10 mb-8 w-full justify-start space-x-8">
          <TabsTrigger value="decisions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF9D] data-[state=active]:bg-transparent px-0 text-[10px]">Architecture Decisions</TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF9D] data-[state=active]:bg-transparent px-0 text-[10px]">Project Knowledge</TabsTrigger>
          <TabsTrigger value="user" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF9D] data-[state=active]:bg-transparent px-0 text-[10px]">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="animate-in fade-in duration-300">
          <div className="grid gap-6">
            {adrState === 'loading' && <ADRSkeleton />}

            {adrState === 'error' && (
              <ErrorState
                message="Could not load architecture decisions."
                detail={adrError}
                onRetry={fetchADRs}
              />
            )}

            {adrState === 'ready' && adrs.length === 0 && (
              <div className="p-16 border border-dashed border-white/5 rounded-3xl text-center space-y-4 bg-white/[0.01]">
                <BookOpen size={48} className="mx-auto text-slate-800" />
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-tight">No decisions recorded</p>
                  <p className="text-xs text-slate-600 font-mono">Formalize your technical choices to build institutional memory.</p>
                </div>
              </div>
            )}

            {adrState === 'ready' && adrs.map(adr => (
              <ADRCard key={adr.id} adr={adr} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="animate-in fade-in duration-300">
          {searchError ? (
            <ErrorState
              message="Memory search failed."
              detail={searchError}
              onRetry={handleSearch}
            />
          ) : isSearching ? (
            <div className="grid gap-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-[68px] rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : memories.length === 0 ? (
            <div className="p-16 border border-dashed border-white/5 rounded-3xl text-center space-y-4 bg-white/[0.01]">
              <Brain size={48} className="mx-auto text-slate-800" />
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase tracking-tight">
                  {hasSearched ? `No matches for "${search}"` : 'Search project knowledge'}
                </p>
                <p className="text-xs text-slate-600 font-mono">
                  {hasSearched
                    ? 'Try a broader term, or capture new knowledge above.'
                    : 'Query patterns, schemas, and agent findings captured for this project.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {memories.map(entry => (
                <div key={entry.id} className="p-4 bg-[#141414] border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-[#00FF9D] transition-colors">
                      <Brain size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{entry.key}</h4>
                      <p className="text-xs text-slate-500 font-mono truncate max-w-lg">{entry.content}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px]">{entry.tier}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="user" className="animate-in fade-in duration-300">
           <div className="p-12 bg-[#141414] border border-white/5 rounded-2xl flex flex-col items-center text-center space-y-4">
             <User size={32} className="text-[#00FF9D]/40" />
             <div className="space-y-1">
               <h3 className="text-sm font-bold text-white uppercase tracking-widest">Developer DNA</h3>
               <p className="text-xs text-slate-500 font-mono">Blueprint learns your coding style and preferences over time.</p>
             </div>
             <Button variant="outline" size="sm" className="mt-4 border-white/10 text-slate-400">View Privacy Audit</Button>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ADRCard({ adr }: { adr: ADR }) {
  return (
    <div className="group p-8 bg-[#141414] border border-white/5 rounded-3xl hover:border-[#00FF9D]/20 transition-all duration-500">
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Badge variant="success" className="bg-[#00FF9D]/5 border-[#00FF9D]/20 text-[#00FF9D]">{adr.status}</Badge>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase group-hover:text-[#00FF9D] transition-colors">{adr.title}</h3>
          <div className="flex items-center space-x-2 text-[10px] text-slate-600 font-mono uppercase tracking-widest">
            <Clock size={12} />
            <span>{adr.created_at}</span>
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 text-slate-500 group-hover:text-white group-hover:bg-[#00FF9D]/10 transition-all duration-500">
          <History size={24} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-white/5 pb-1 block">Context</span>
          <p className="text-sm text-slate-400 font-mono leading-relaxed line-clamp-4 italic">"{adr.context}"</p>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-white/5 pb-1 block">Decision</span>
          <p className="text-sm text-slate-300 font-bold leading-relaxed line-clamp-4">{adr.decision}</p>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/[0.03] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2">
            {[1,2].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[#141414] bg-slate-800 flex items-center justify-center">
                <User size={12} className="text-slate-400" />
              </div>
            ))}
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Verified by Principal Agent</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-[11px] uppercase font-black tracking-widest hover:text-[#00FF9D] hover:bg-transparent">
          Explore Impact
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ADRSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading decisions">
      {[0, 1].map(i => (
        <div key={i} className="p-8 bg-[#141414] border border-white/5 rounded-3xl space-y-8">
          <div className="space-y-3">
            <div className="h-4 w-20 rounded-full bg-white/5 animate-pulse" />
            <div className="h-7 w-2/3 rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  detail,
  onRetry
}: {
  message: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="p-12 border border-red-500/20 bg-red-500/[0.03] rounded-3xl text-center space-y-4"
    >
      <AlertTriangle size={40} className="mx-auto text-red-500/60" />
      <div className="space-y-2">
        <p className="text-slate-300 font-bold uppercase tracking-tight">{message}</p>
        {detail && (
          <p className="text-xs text-slate-500 font-mono break-words max-w-xl mx-auto leading-relaxed">
            {detail}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-white/10">
          Retry
        </Button>
      )}
    </div>
  );
}
