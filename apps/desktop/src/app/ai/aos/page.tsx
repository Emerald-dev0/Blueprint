'use client';

import * as React from 'react';
import {
  ActivityIndicator,
  Badge,
  Button,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@blueprint/ui';
import { BookOpen, Cpu, RefreshCw, User, Workflow } from 'lucide-react';
import { api, type OperatingManual } from '../../../lib/ipc';
import { groupThinkingFramework, hasOperatingManual } from '../../../lib/personas';
import { WorkflowPlanner } from '../../../components/ai/workflow-planner';

export default function AOSDashboard() {
  const [manuals, setManuals] = React.useState<OperatingManual[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setManuals(await api.getOperatingManuals());
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  /** Persona id -> display name, so the planner can label tasks with the
   *  persona a human recognises instead of its directory slug. */
  const personaNames = React.useMemo(
    () => Object.fromEntries(manuals.map((manual) => [manual.id, manual.name])),
    [manuals],
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0B0B0B]">
        <ActivityIndicator label="Loading persona registry..." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#00FF9D]">
            <Cpu size={20} />
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">
              Agent OS Kernel
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Persona operating manuals loaded from the local registry.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-[#00FF9D] border-[#00FF9D]/20">
            {manuals.length} manuals loaded
          </Badge>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw size={13} className="mr-2" />
            Reload
          </Button>
        </div>
      </header>

      {loadError && <p className="text-xs text-red-400 font-mono">{loadError}</p>}

      {manuals.length === 0 && !loadError && (
        <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center space-y-3">
          <BookOpen size={36} className="mx-auto text-slate-700" />
          <p className="text-sm text-slate-400 font-mono">No persona manuals were found on disk.</p>
          <p className="text-xs text-slate-600 font-mono max-w-md mx-auto">
            The registry looks in the bundled resources, then the monorepo checkout. Set
            BLUEPRINT_PERSONAS_DIR to point it somewhere else.
          </p>
        </div>
      )}

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="bg-white/5 border border-white/5 h-10 mb-8">
          <TabsTrigger value="registry">Persona Registry</TabsTrigger>
          <TabsTrigger value="runtime">Workflow Planner</TabsTrigger>
        </TabsList>

        <TabsContent
          value="registry"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {manuals.map((manual) => (
            <PersonaCard key={manual.id} manual={manual} />
          ))}
        </TabsContent>

        <TabsContent value="runtime" className="space-y-8">
          <div className="flex items-start justify-between gap-6 border-b border-white/5 pb-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-slate-300">
                <Workflow size={16} />
                <h2 className="text-sm font-bold uppercase tracking-tight">Workflow Planner</h2>
              </div>
              <p className="max-w-xl font-mono text-[11px] leading-relaxed text-slate-500">
                Returns the core&apos;s three-step plan for a goal - requirements, architecture,
                review - each naming the persona that should execute it. Runs entirely locally; the
                decomposition is a fixed scaffold, not an LLM plan.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 border-white/10 text-[9px] text-slate-500">
              {manuals.length} personas available
            </Badge>
          </div>

          <WorkflowPlanner personaNames={personaNames} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PersonaCard({ manual }: { manual: OperatingManual }) {
  const steps = groupThinkingFramework(manual.thinking_framework);

  return (
    <div className="group p-6 bg-[#141414] border border-white/5 rounded-2xl hover:border-[#00FF9D]/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white group-hover:text-[#00FF9D] transition-colors">
            {manual.name}
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">v{manual.version}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-slate-500">
          <User size={16} />
        </div>
      </div>

      <p className="text-xs text-slate-400 font-mono leading-relaxed line-clamp-3 mb-6 italic">
        &ldquo;{manual.identity}&rdquo;
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">
            Core Mission
          </span>
          <p className="text-[10px] text-slate-300 font-mono">{manual.mission}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {hasOperatingManual(manual) ? (
            <Badge variant="outline" className="text-[8px] text-[#00FF9D] border-[#00FF9D]/20">
              instructions.md
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[8px] text-amber-400 border-amber-400/20">
              metadata only
            </Badge>
          )}
          {manual.labels.map((label) => (
            <Badge key={label} variant="outline" className="text-[8px] text-slate-500">
              {label}
            </Badge>
          ))}
        </div>

        {manual.responsibilities.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">
              Responsibilities
            </span>
            <ul className="space-y-1">
              {manual.responsibilities.slice(0, 3).map((item, i) => (
                <li key={i} className="text-[10px] text-slate-400 font-mono leading-snug">
                  · {item}
                </li>
              ))}
              {manual.responsibilities.length > 3 && (
                <li className="text-[9px] text-slate-600 font-mono">
                  +{manual.responsibilities.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {steps.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">
              Framework steps
            </span>
            <ul className="space-y-0.5">
              {steps.map((step, i) => (
                <li key={i} className="text-[10px] text-slate-400 font-mono leading-snug">
                  {i + 1}. {step.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />
        <p className="text-[9px] font-mono text-slate-600">{manual.id}</p>
      </div>
    </div>
  );
}
