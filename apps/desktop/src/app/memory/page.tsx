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
  Textarea,
} from '@blueprint/ui';
import {
  History,
  Search,
  Plus,
  Brain,
  BookOpen,
  User,
  Bot,
  Database,
  Clock,
} from 'lucide-react';
import { api, type ADR, type MemoryEntry } from '../../lib/ipc';

export default function MemoryPage() {
  const [adrs, setAdrs] = React.useState<ADR[]>([]);
  const [memories, setMemories] = React.useState<MemoryEntry[]>([]);
  const [search, setSearch] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // "Add Knowledge" dialog state
  const [knowledgeOpen, setKnowledgeOpen] = React.useState(false);
  const [knowledgeKey, setKnowledgeKey] = React.useState('');
  const [knowledgeBody, setKnowledgeBody] = React.useState('');

  // "New ADR" dialog state
  const [adrOpen, setAdrOpen] = React.useState(false);
  const [adrTitle, setAdrTitle] = React.useState('');
  const [adrContext, setAdrContext] = React.useState('');
  const [adrDecision, setAdrDecision] = React.useState('');
  const [adrConsequences, setAdrConsequences] = React.useState('');

  const fetchADRs = React.useCallback(async () => {
    try {
      setError(null);
      setAdrs(await api.getAdrs());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  React.useEffect(() => {
    fetchADRs();
  }, [fetchADRs]);

  const handleSearch = async () => {
    if (!search.trim()) {
      setMemories([]);
      return;
    }
    setIsSearching(true);
    try {
      setError(null);
      setMemories(await api.searchMemory(search));
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveKnowledge = async () => {
    try {
      setError(null);
      await api.saveMemoryEntry({ key: knowledgeKey, content: knowledgeBody });
      setKnowledgeOpen(false);
      setKnowledgeKey('');
      setKnowledgeBody('');
      await handleSearch();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSealAdr = async () => {
    try {
      setError(null);
      await api.createAdr({
        title: adrTitle,
        context: adrContext,
        decision: adrDecision,
        consequences: adrConsequences,
      });
      setAdrOpen(false);
      setAdrTitle('');
      setAdrContext('');
      setAdrDecision('');
      setAdrConsequences('');
      await fetchADRs();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic text-[#00FF9D]">
            Institutional Memory
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Capture decisions, reasoning, and system evolution.
          </p>
        </div>

        <div className="flex gap-3">
          <Dialog open={knowledgeOpen} onOpenChange={setKnowledgeOpen}>
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
                <Input
                  placeholder="Key (e.g. auth-logic)"
                  value={knowledgeKey}
                  onChange={(e) => setKnowledgeKey(e.target.value)}
                />
                <Textarea
                  placeholder="Describe the pattern or knowledge..."
                  className="min-h-[100px]"
                  value={knowledgeBody}
                  onChange={(e) => setKnowledgeBody(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSaveKnowledge}
                  disabled={!knowledgeKey.trim() || !knowledgeBody.trim()}
                >
                  Ingest Memory
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={adrOpen} onOpenChange={setAdrOpen}>
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
                <Input
                  placeholder="Decision Title (e.g. choice of database)"
                  value={adrTitle}
                  onChange={(e) => setAdrTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Context: What problem are we solving?"
                  className="min-h-[80px]"
                  value={adrContext}
                  onChange={(e) => setAdrContext(e.target.value)}
                />
                <Textarea
                  placeholder="Decision: What is the solution?"
                  className="min-h-[80px]"
                  value={adrDecision}
                  onChange={(e) => setAdrDecision(e.target.value)}
                />
                <Textarea
                  placeholder="Consequences: What happens next?"
                  className="min-h-[60px]"
                  value={adrConsequences}
                  onChange={(e) => setAdrConsequences(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="primary"
                  className="w-full text-black"
                  onClick={handleSealAdr}
                  disabled={!adrTitle.trim() || !adrDecision.trim()}
                >
                  Seal Decision
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

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
          {isSearching && <Badge variant="outline" className="font-mono text-[9px]">Searching…</Badge>}
        </div>
      </div>

      <Tabs defaultValue="decisions" className="w-full">
        <TabsList className="bg-transparent border-b border-white/5 rounded-none p-0 h-10 mb-8 w-full justify-start space-x-8">
          <TabsTrigger value="decisions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF9D] data-[state=active]:bg-transparent px-0 text-[10px]">
            Architecture Decisions
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF9D] data-[state=active]:bg-transparent px-0 text-[10px]">
            Project Knowledge
          </TabsTrigger>
          <TabsTrigger value="user" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF9D] data-[state=active]:bg-transparent px-0 text-[10px]">
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decisions">
          <div className="grid gap-6">
            {adrs.length === 0 ? (
              <div className="p-16 border border-dashed border-white/5 rounded-3xl text-center space-y-4 bg-white/[0.01]">
                <BookOpen size={48} className="mx-auto text-slate-800" />
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-tight">
                    No decisions recorded
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    Use “New ADR” to formalize your first technical choice.
                  </p>
                </div>
              </div>
            ) : (
              adrs.map((adr) => <ADRCard key={adr.id} adr={adr} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="knowledge">
          {memories.length === 0 ? (
            <div className="grid grid-cols-3 gap-6">
              <KnowledgeCard icon={Database} title="Data Models" description="Core schemas and relationships." />
              <KnowledgeCard icon={History} title="Security Patterns" description="Auth and encryption rules." />
              <KnowledgeCard icon={Bot} title="Agent Insights" description="Discovered system patterns." />
            </div>
          ) : (
            <div className="grid gap-4">
              {memories.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-[#141414] border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-[#00FF9D]">
                      <Brain size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{entry.key}</h4>
                      <p className="text-xs text-slate-500 font-mono truncate max-w-lg">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px]">
                    {entry.tier}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="user">
          <div className="p-12 bg-[#141414] border border-white/5 rounded-2xl flex flex-col items-center text-center space-y-4">
            <User size={32} className="text-[#00FF9D]/40" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                Developer Preferences
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Learned preferences are not yet captured; this tier is reserved for future work.
              </p>
            </div>
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
          <Badge variant="success" className="bg-[#00FF9D]/5 border-[#00FF9D]/20 text-[#00FF9D]">
            {adr.status}
          </Badge>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase group-hover:text-[#00FF9D] transition-colors">
            {adr.title}
          </h3>
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
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-white/5 pb-1 block">
            Context
          </span>
          <p className="text-sm text-slate-400 font-mono leading-relaxed line-clamp-4 italic">
            {adr.context || '—'}
          </p>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-white/5 pb-1 block">
            Decision
          </span>
          <p className="text-sm text-slate-300 font-bold leading-relaxed line-clamp-4">
            {adr.decision}
          </p>
        </div>
      </div>

      {adr.consequences && (
        <div className="mt-6 space-y-2">
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-white/5 pb-1 block">
            Consequences
          </span>
          <p className="text-sm text-slate-400 font-mono leading-relaxed">{adr.consequences}</p>
        </div>
      )}

      {/* The "Explore Impact" button that used to sit here had no handler:
          there is no impact graph in the core to explore. */}
    </div>
  );
}

function KnowledgeCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl space-y-4 hover:bg-white/[0.02] cursor-pointer group">
      <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-500 group-hover:text-[#00FF9D] flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-500 font-mono leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
