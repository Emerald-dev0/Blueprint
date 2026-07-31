'use client';

import * as React from 'react';
import {
  Button,
  Badge,
  Separator,
  ActivityIndicator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@blueprint/ui';
import {
  Cpu,
  Terminal,
  ShieldCheck,
  Activity,
  User,
  Zap,
  BookOpen,
  LayoutGrid
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export default function AOSDashboard() {
  const [manuals, setManuals] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAOSData = async () => {
      try {
        const res: any[] = await invoke('get_operating_manuals');
        setManuals(res);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAOSData();
  }, []);

  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0B0B0B]">
      <ActivityIndicator label="Booting Agent OS Kernel..." />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#00FF9D]">
            <Cpu size={20} />
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Agent OS Kernel</h1>
          </div>
          <p className="text-xs text-slate-500 font-mono">v1.0.0-alpha.1 | State: OPERATIONAL</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-[#00FF9D] border-[#00FF9D]/20">11 Experts Active</Badge>
          <Badge variant="primary">L5 Governance</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Orchestrations" value="1,240" icon={Activity} />
        <StatCard label="Prompt Tokens" value="2.4M" icon={Zap} />
        <StatCard label="Security Redactions" value="48" icon={ShieldCheck} />
        <StatCard label="Memory Density" value="156kb" icon={BookOpen} />
      </div>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="bg-white/5 border border-white/5 h-10 mb-8">
          <TabsTrigger value="registry">Persona Registry</TabsTrigger>
          <TabsTrigger value="runtime">Execution Runtime</TabsTrigger>
          <TabsTrigger value="security">Safety Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {manuals.map(manual => (
            <PersonaCard key={manual.id} manual={manual} />
          ))}
        </TabsContent>

        <TabsContent value="runtime" className="p-12 border border-dashed border-white/5 rounded-3xl text-center space-y-4">
          <Terminal size={48} className="mx-auto text-slate-800" />
          <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">Active Tool Runtime Monitoring coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <div className="p-5 bg-[#141414] border border-white/5 rounded-2xl space-y-2">
      <div className="flex items-center space-x-2 text-slate-500">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function PersonaCard({ manual }: { manual: any }) {
  return (
    <div className="group p-6 bg-[#141414] border border-white/5 rounded-2xl hover:border-[#00FF9D]/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white group-hover:text-[#00FF9D] transition-colors">{manual.name}</h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">v{manual.version}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-slate-500">
          <User size={16} />
        </div>
      </div>

      <p className="text-xs text-slate-400 font-mono leading-relaxed line-clamp-3 mb-6 italic">"{manual.identity}"</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
           <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Core Mission</span>
           <p className="text-[10px] text-slate-300 font-mono">{manual.mission}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
           {manual.expertise.slice(0, 3).map((exp: string) => (
             <Badge key={exp} variant="outline" className="text-[8px] bg-white/5 border-none text-slate-500">{exp}</Badge>
           ))}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-mono text-slate-500">Operating Manual Sealed</span>
        <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase font-bold text-[#00FF9D]">View Logic</Button>
      </div>
    </div>
  );
}
