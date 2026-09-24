'use client';

import * as React from 'react';
import { Badge, Button, Input, Separator } from '@blueprint/ui';
import { FileCode2, FolderSearch, Globe, Network, Share2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { api, pickProjectDirectory, type AgentContextExport, type RepoReport } from '../../lib/ipc';

/** Tools that read the files Blueprint writes; shown so the action is legible. */
const AGENT_READERS = [
  'OpenCode',
  'Freebuff',
  'Codebuff',
  'Codex CLI',
  'Claude Code',
  'Gemini CLI',
  'Amp',
  'Cursor',
  'Zed',
];

export default function IntelligencePage() {
  const [url, setUrl] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [webError, setWebError] = React.useState<string | null>(null);
  const [webReport, setWebReport] = React.useState<{
    title: string;
    tech_detected: string[];
    headings: string[];
  } | null>(null);

  const [projectPath, setProjectPath] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<RepoReport | null>(null);

  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [exportResult, setExportResult] = React.useState<AgentContextExport | null>(null);

  const handleExportAgentContext = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      setExportResult(await api.exportAgentContext());
    } catch (e) {
      setExportError(String(e));
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    api
      .getProjectPath()
      .then(setProjectPath)
      .catch(() => setProjectPath(null));
  }, []);

  const handleImportAndScan = async () => {
    setScanError(null);
    setIsScanning(true);
    try {
      const chosen = await pickProjectDirectory();
      if (!chosen) {
        setIsScanning(false);
        return;
      }
      setProjectPath(chosen);
      setReport(await api.analyzeRepo());
    } catch (e) {
      setScanError(String(e));
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyzeWeb = async () => {
    if (!url.trim()) return;
    setWebError(null);
    setIsAnalyzing(true);
    try {
      const res = await invoke('analyze_website', { url });
      setWebReport(res as typeof webReport);
    } catch (e) {
      setWebError(String(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
            Project Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Repository and reference-site analysis, run locally.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="p-6 bg-[#141414] border border-white/5 rounded-2xl space-y-6">
          <div className="flex items-center space-x-2 text-[#00FF9D]">
            <Globe size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">
              Web Reverse Engineering
            </h3>
          </div>
          <div className="flex space-x-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter reference URL (e.g. https://linear.app)"
              className="bg-black/20 border-white/5 h-10"
            />
            <Button onClick={handleAnalyzeWeb} disabled={isAnalyzing} variant="primary">
              Analyze
            </Button>
          </div>

          {webError && <p className="text-xs text-red-400 font-mono">{webError}</p>}

          {webReport && (
            <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-tighter">
                Analysis Results
              </h4>
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-500 uppercase">Title</span>
                <span className="text-[10px] text-slate-300 truncate max-w-[150px]">
                  {webReport.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-500 uppercase">Tech Detected</span>
                <div className="flex gap-1">
                  {webReport.tech_detected.length === 0 ? (
                    <span className="text-[10px] text-slate-600">none detected</span>
                  ) : (
                    webReport.tech_detected.map((t) => (
                      <Badge key={t} className="px-1 py-0">
                        {t}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Structure (H1s)</span>
                <ul className="text-[10px] text-slate-400 font-mono">
                  {webReport.headings.slice(0, 3).map((h, i) => (
                    <li key={i} className="truncate">
                      • {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className="p-6 bg-[#141414] border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-[#00FF9D]">
            <FolderSearch size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">Repository Mapping</h3>
          </div>

          <p className="text-xs text-slate-500 font-mono leading-relaxed">
            Blueprint walks the repository locally (respecting .gitignore) and reports the
            languages, frameworks and data stores it finds. Nothing is uploaded.
          </p>

          {projectPath && (
            <p className="text-[10px] font-mono text-slate-400 truncate" title={projectPath}>
              Open: {projectPath}
            </p>
          )}

          <Button
            variant="outline"
            className="w-full h-10 border-dashed"
            onClick={handleImportAndScan}
            disabled={isScanning}
          >
            {isScanning
              ? 'Scanning…'
              : projectPath
                ? 'Rescan / Change Repository'
                : 'Import Local Directory'}
          </Button>

          {scanError && <p className="text-xs text-red-400 font-mono">{scanError}</p>}

          {report && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-slate-500">
                {report.files_scanned.toLocaleString()} files examined
              </p>
              <StackRow label="Languages" values={report.stack.languages} />
              <StackRow label="Frontend" values={report.stack.frontend} />
              <StackRow label="Backend" values={report.stack.backend} />
              <StackRow label="Data stores" values={report.stack.database} />
            </div>
          )}
        </section>
      </div>

      <section className="p-6 bg-[#141414] border border-white/5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-2 text-[#00FF9D]">
            <Share2 size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">Agent Interoperability</h3>
          </div>
          <Button
            variant="primary"
            className="h-9"
            onClick={handleExportAgentContext}
            disabled={isExporting || !projectPath}
          >
            <FileCode2 size={14} className="mr-2" />
            {isExporting ? 'Exporting…' : 'Export agent context'}
          </Button>
        </div>

        <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-3xl">
          Writes <span className="text-slate-300">AGENTS.md</span> into the open project — the
          detected stack, the build and test commands this repo declares, your recorded architecture
          decisions, sealed knowledge, the installed persona standards and the boundaries agents
          must respect — plus <span className="text-slate-300">CLAUDE.md</span>,{' '}
          <span className="text-slate-300">GEMINI.md</span> and{' '}
          <span className="text-slate-300">knowledge.md</span> that point at it, because those tools
          look for their own filename first. Any other coding agent then starts from
          Blueprint&apos;s understanding instead of rediscovering the repository. Values are passed
          through the local secret redactor before they touch disk, and files Blueprint did not
          generate are never overwritten.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {AGENT_READERS.map((tool) => (
            <Badge key={tool} variant="outline" className="text-[9px] text-slate-400">
              {tool}
            </Badge>
          ))}
        </div>

        {!projectPath && (
          <p className="text-[10px] font-mono text-slate-600">
            Import a repository above first — the export is written to the project root.
          </p>
        )}

        {exportError && <p className="text-xs text-red-400 font-mono">{exportError}</p>}

        {exportResult && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-400">
              <span>{exportResult.files_scanned.toLocaleString()} files scanned</span>
              <span>{exportResult.adrs} decisions</span>
              <span>{exportResult.memories} memories</span>
              <span>{exportResult.personas} personas</span>
              <span className="text-[#00FF9D]">
                {exportResult.secrets_redacted} secret span(s) redacted
              </span>
            </div>

            <ul className="space-y-1.5">
              {exportResult.written.map((f) => (
                <li key={f.path} className="flex items-start gap-2 text-[10px] font-mono">
                  <span className="text-[#00FF9D] shrink-0">written</span>
                  <span className="text-slate-300 break-all">{f.path}</span>
                  <span className="text-slate-600 shrink-0">{f.bytes} B</span>
                </li>
              ))}
              {exportResult.skipped.map((f) => (
                <li key={f.path} className="flex items-start gap-2 text-[10px] font-mono">
                  <span className="text-amber-400 shrink-0">skipped</span>
                  <span className="text-slate-400 break-all">{f.path}</span>
                  <span className="text-slate-600">— {f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Separator />

      <div className="h-40 border border-dashed border-white/10 flex items-center justify-center rounded-2xl">
        <div className="text-center space-y-2">
          <Network size={32} className="mx-auto text-slate-700" />
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Architecture graph renders once a project has been scanned
          </p>
        </div>
      </div>
    </div>
  );
}

function StackRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] text-slate-500 uppercase shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1 justify-end">
        {values.length === 0 ? (
          <span className="text-[10px] text-slate-600">none detected</span>
        ) : (
          values.map((v) => (
            <Badge key={v} variant="outline" className="text-[9px]">
              {v}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
