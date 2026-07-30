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
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface ADR {
  id: number;
  title: String;
  status: String;
  context: String;
  decision: String;
  consequences: String;
  created_at: String;
}

export default function MemoryPage() {
  const [adrs, setAdrs] = React.useState<ADR[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const fetchADRs = async () => {
      try {
        // Using a mock project ID for now
        const res: ADR[] = await invoke('get_adrs', { projectId: 'default' });
        setAdrs(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchADRs();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">Institutional Memory</h1>
          <p className="text-xs text-slate-500 font-mono">Capture decisions, reasoning, and system evolution.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="primary">
              <Plus size={16} className="mr-2" />
              New Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Architecture Decision Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input placeholder="Decision Title (e.g. choice of database)" />
              <Textarea placeholder="Context: What problem are we solving?" className="min-h-[100px]" />
              <Textarea placeholder="Decision: What is the solution?" className="min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="primary" className="w-full">Seal Decision</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search through decisions, constraints, and intent..."
          className="pl-10 bg-white/5 border-white/5 h-12"
        />
      </div>

      <div className="grid gap-6">
        {adrs.length === 0 ? (
          <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center space-y-4">
            <BookOpen size={32} className="mx-auto text-slate-700" />
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">No decisions recorded yet</p>
          </div>
        ) : (
          adrs.map(adr => (
            <ADRCard key={adr.id} adr={adr} />
          ))
        )}

        {/* Mock ADR if none exist to show UI */}
        {adrs.length === 0 && (
          <ADRCard adr={{
            id: 0,
            title: "Choice of Tauri v2",
            status: "Accepted",
            context: "Blueprint requires high performance and local filesystem access.",
            decision: "Use Tauri v2 with Rust core.",
            consequences: "Increased safety, smaller bundle size.",
            created_at: "2026-07-29"
          }} />
        )}
      </div>
    </div>
  );
}

function ADRCard({ adr }: { adr: ADR }) {
  return (
    <div className="group p-6 bg-[#141414] border border-white/5 rounded-2xl hover:border-[#00FF9D]/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <Badge variant="success" className="mb-2">{adr.status}</Badge>
          <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-[#00FF9D] transition-colors">{adr.title}</h3>
          <p className="text-[10px] text-slate-600 font-mono uppercase">{adr.created_at}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-slate-500 group-hover:text-white transition-colors">
          <History size={18} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-6">
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Context</span>
          <p className="text-xs text-slate-400 font-mono leading-relaxed line-clamp-3">{adr.context}</p>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Decision</span>
          <p className="text-xs text-slate-400 font-mono leading-relaxed line-clamp-3">{adr.decision}</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
          <ShieldCheck size={12} className="text-[#00FF9D]" />
          <span>Institutional Memory Verified</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold">
          View Full Details
          <ChevronRight size={12} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
