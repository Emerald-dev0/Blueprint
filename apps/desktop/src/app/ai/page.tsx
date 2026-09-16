'use client';

import * as React from 'react';
import { ActivityIndicator, AIProposalSurface, Badge, Button, Input } from '@blueprint/ui';
import { Bot, ChevronRight, Send, ShieldCheck, Sparkles, User } from 'lucide-react';
import {
  api,
  type CompletionResult,
  type OperatingManual,
} from '../../lib/ipc';
import {
  groupThinkingFramework,
  hasOperatingManual,
  sortManuals,
} from '../../lib/personas';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** A real, in-session record of what was sent and what came back. */
interface RunRecord {
  persona: string;
  provider: string;
  model: string;
  secretsRedacted: number;
  at: number;
}

/** Turns replayed into the compiled prompt so the persona has conversation memory. */
const HISTORY_WINDOW = 8;

const DEFAULT_PERSONA = 'principal-engineer';

export default function AIPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showRuns, setShowRuns] = React.useState(false);
  const [runs, setRuns] = React.useState<RunRecord[]>([]);
  const [manuals, setManuals] = React.useState<OperatingManual[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .getOperatingManuals()
      .then((loaded) => {
        const ordered = sortManuals(loaded);
        setManuals(ordered);
        setActiveId(
          ordered.find((m) => m.id === DEFAULT_PERSONA)?.id ?? ordered[0]?.id ?? null
        );
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  const manual = manuals.find((m) => m.id === activeId) ?? null;
  const steps = React.useMemo(
    () => groupThinkingFramework(manual?.thinking_framework),
    [manual]
  );
  const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
  const totalRedactions = runs.reduce((sum, r) => sum + r.secretsRedacted, 0);

  const handleSend = async () => {
    const goal = input.trim();
    if (!goal || isLoading || !manual) return;

    const history = messages.slice(-HISTORY_WINDOW).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: 'user', content: goal }]);
    setInput('');
    setIsLoading(true);

    try {
      // The persona path: the Rust core compiles this persona's operating
      // manual, thinking framework and quality standards into the system
      // prompt, injects git/project context and redacts secrets locally.
      const result: CompletionResult = await api.runAosCompletion(manual.id, goal, {
        conversation_history: history,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: result.content }]);
      setRuns((prev) => [
        ...prev,
        {
          persona: manual.id,
          provider: result.provider_id,
          model: result.model_id,
          secretsRedacted: result.secrets_redacted,
          at: Date.now(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${String(error)}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-[#0B0B0B] overflow-hidden">
      <div className="flex-grow flex flex-col border-r border-white/5 h-full overflow-hidden">
        <header className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#00FF9D]/10 rounded-lg text-[#00FF9D]">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">AI Teammate</h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {manual ? `Speaking as ${manual.name}` : 'No persona loaded'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px]"
              onClick={() => setShowRuns(!showRuns)}
            >
              Session log
            </Button>
            {totalRedactions > 0 && (
              <Badge variant="outline" className="text-[#00FF9D] border-[#00FF9D]/20">
                <ShieldCheck size={11} className="mr-1" />
                {totalRedactions} redacted
              </Badge>
            )}
            {lastRun && <Badge variant="primary">{lastRun.model}</Badge>}
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                <Bot size={24} />
              </div>
              <p className="text-sm text-slate-500 font-mono max-w-md leading-relaxed">
                Pick a persona on the right and ask it to review a design, plan a feature or
                audit code. The persona&apos;s full operating manual — decision framework,
                failure modes and quality standards — is compiled into the system prompt, and
                secrets in your message are redacted locally before anything is sent.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] flex items-start space-x-3 ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`mt-1 p-1.5 rounded-md ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white'
                      : 'bg-[#00FF9D]/10 text-[#00FF9D]'
                  }`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {msg.role === 'assistant' ? (
                  <AIProposalSurface className="p-4">
                    <p className="text-sm font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </AIProposalSurface>
                ) : (
                  <div className="p-3 bg-[#141414] border border-white/5 rounded-xl">
                    <p className="text-sm text-slate-300">{msg.content}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-md bg-[#00FF9D]/10 text-[#00FF9D]">
                  <Bot size={14} />
                </div>
                <ActivityIndicator label="Thinking..." />
              </div>
            </div>
          )}
        </div>

        <footer className="p-6 bg-[#0B0B0B] border-t border-white/5">
          <div className="max-w-3xl mx-auto relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                manual
                  ? `Ask ${manual.name} something...`
                  : 'No persona is loaded — see the Agent OS page'
              }
              disabled={!manual}
              className="pr-12 h-12 bg-[#141414] border-white/10 focus-visible:ring-[#00FF9D]/50"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !manual}
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00FF9D] hover:bg-[#00FF9D]/10"
            >
              <Send size={18} />
            </Button>
          </div>
        </footer>
      </div>

      <div className="w-[320px] h-full flex flex-col bg-[#0B0B0B] overflow-y-auto">
        <div className="p-6 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Personas
            </h3>
            <Badge variant="outline" className="text-slate-400 border-white/10">
              {manuals.length} loaded
            </Badge>
          </div>

          {loadError && (
            <p className="text-[10px] font-mono text-red-400 leading-relaxed">{loadError}</p>
          )}

          {!loadError && manuals.length === 0 && (
            <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
              No persona manuals were found. The registry looks in the bundled resources
              first, then in <span className="text-slate-300">packages/personas</span>.
            </p>
          )}

          <div className="space-y-1 max-h-[38vh] overflow-y-auto pr-1">
            {manuals.map((m) => {
              const isActive = m.id === activeId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveId(m.id)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border transition-colors ${
                    isActive
                      ? 'border-[#00FF9D]/40 bg-[#00FF9D]/10 text-[#00FF9D]'
                      : 'border-white/5 bg-[#141414] text-slate-400 hover:border-white/15'
                  }`}
                >
                  <span className="text-[11px] font-mono truncate">{m.name}</span>
                  {isActive && <ChevronRight size={12} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {manual && (
          <div className="p-6 border-b border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Active Expert
              </h3>
              <Badge variant="primary">v{manual.version}</Badge>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#00FF9D]">{manual.name}</h4>
              <p className="text-[10px] font-mono text-slate-600">{manual.id}</p>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                {manual.identity}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {hasOperatingManual(manual) && (
                <Badge variant="outline" className="text-[9px] text-slate-400 border-white/10">
                  operating manual
                </Badge>
              )}
              {manual.responsibilities.length > 0 && (
                <Badge variant="outline" className="text-[9px] text-slate-400 border-white/10">
                  {manual.responsibilities.length} responsibilities
                </Badge>
              )}
              {manual.quality_standards.length > 0 && (
                <Badge variant="outline" className="text-[9px] text-slate-400 border-white/10">
                  {manual.quality_standards.length} quality gates
                </Badge>
              )}
            </div>

            {steps.length > 0 && (
              <div className="pt-2">
                <p className="text-[9px] font-black uppercase text-slate-600 mb-2">
                  Thinking Framework
                </p>
                <ol className="space-y-2.5">
                  {steps.map((step, i) => (
                    <li key={i} className="space-y-1">
                      <div className="flex items-start space-x-2">
                        <span className="w-3.5 h-3.5 mt-[2px] rounded-full bg-white/5 flex items-center justify-center text-[8px] text-[#00FF9D] shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300 leading-snug">
                          {step.title}
                        </span>
                      </div>
                      {step.details.length > 0 && (
                        <ul className="space-y-0.5 ml-[22px]">
                          {step.details.map((detail, j) => (
                            <li
                              key={j}
                              className="text-[10px] font-mono text-slate-600 leading-snug"
                            >
                              · {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {showRuns && (
          <div className="p-6 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              This session
            </h3>
            {runs.length === 0 ? (
              <p className="text-[10px] font-mono text-slate-600">No runs yet.</p>
            ) : (
              runs.map((r, i) => (
                <div key={i} className="text-[10px] font-mono text-slate-400 space-y-0.5">
                  <p className="text-slate-300">{r.persona}</p>
                  <p>
                    {r.provider} / {r.model}
                  </p>
                  <p className="text-slate-600">
                    {new Date(r.at).toLocaleTimeString()} ·{' '}
                    {r.secretsRedacted} secret(s) redacted
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
