'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Badge,
  Separator,
  ActivityIndicator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@blueprint/ui';
import {
  Search,
  Globe,
  FolderSearch,
  Network,
  FileWarning,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export default function IntelligencePage() {
  const [url, setUrl] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [report, setReport] = React.useState<any>(null);

  const handleAnalyzeWeb = async () => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await invoke('analyze_website', { url });
      setReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">Project Intelligence</h1>
          <p className="text-xs text-slate-500 font-mono">Autonomous reverse engineering and repository analysis.</p>
        </div>
        <Badge variant="primary">Engine Active</Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Web Intelligence Card */}
        <section className="p-6 bg-surface-1 border border-white/5 rounded-2xl space-y-6">
          <div className="flex items-center space-x-2 text-mint">
            <Globe size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">Web Reverse Engineering</h3>
          </div>
          <div className="flex space-x-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter reference URL (e.g. https://linear.app)"
              className="bg-black/20 border-white/5 h-10"
            />
            <Button onClick={handleAnalyzeWeb} disabled={isAnalyzing} variant="primary">Analyze</Button>
          </div>

          {isAnalyzing && <ActivityIndicator label="Extracting DOM and Design Tokens..." />}

          {report && (
            <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 animate-in fade-in duration-300">
              <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-tighter">Analysis Results</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-500 uppercase">Title</span>
                  <span className="text-[10px] text-slate-300 truncate max-w-[150px]">{report.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-500 uppercase">Tech Detected</span>
                  <div className="flex gap-1">
                    {report.tech_detected.map((t: string) => <Badge key={t} className="px-1 py-0">{t}</Badge>)}
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Structure (H1s)</span>
                  <ul className="text-[10px] text-slate-400 font-mono">
                    {report.headings.slice(0, 3).map((h: string, i: number) => (
                      <li key={i} className="truncate">• {h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Repository Card */}
        <section className="p-6 bg-surface-1 border border-white/5 rounded-2xl space-y-6">
          <div className="flex items-center space-x-2 text-mint">
            <FolderSearch size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">Repository Mapping</h3>
          </div>
          <p className="text-xs text-slate-500 font-mono leading-relaxed">
            Blueprint automatically indexes your local repository to build a technical map of services, components, and risks.
          </p>
          <div className="pt-4">
            <Button variant="outline" className="w-full h-10 border-dashed">
              Import Local Directory
            </Button>
          </div>
        </section>
      </div>

      <Separator />

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="bg-white/5 border border-white/5">
          <TabsTrigger value="map">Architecture Map</TabsTrigger>
          <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
          <TabsTrigger value="risks">Risk Report</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="h-64 border border-dashed border-white/10 rounded-2xl mt-4 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Network size={32} className="mx-auto text-slate-700" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Select a project to render architecture</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
