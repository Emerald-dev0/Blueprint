'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Badge,
  AIProposalSurface,
  ActivityIndicator
} from '@blueprint/ui';
import { Send, Bot, User, Sparkles, LayoutList } from 'lucide-react';
import { invoke } from '../../lib/ipc';
import { ExecutionTimeline } from '../../components/ai/execution-timeline';
import { Task, Persona } from '@blueprint/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [activePersona, setActivePersona] = React.useState<Persona | null>(null);

  const [tasks] = React.useState<Task[]>([
    {
      id: '1',
      title: 'Analyze Project Intent',
      description: 'Understanding core architectural patterns.',
      roleId: 'principal',
      status: 'completed',
      dependencies: [],
      output: 'Project identified as a Tauri/Next.js monorepo.'
    },
    {
      id: '2',
      title: 'Extract Schema Requirements',
      description: 'Mapping necessary data models for implementation.',
      roleId: 'architect',
      status: 'active',
      dependencies: ['1']
    },
  ]);

  React.useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const personas: Persona[] = await invoke('get_personas');
        setActivePersona(personas.find(p => p.id === 'principal') || null);
      } catch (e) {
        console.error("Failed to fetch personas", e);
      }
    };
    fetchPersonas();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response: string = await invoke('generate_ai_completion', {
        providerId: 'gemini',
        modelId: 'gemini-1.5-flash',
        messages: [...messages, userMessage]
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${String(error)}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-ink overflow-hidden">
      <div className="flex-grow flex flex-col border-r border-white/5 h-full overflow-hidden">
        <header className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-mint/10 rounded-lg text-mint">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">AI Teammate</h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Orchestrating engineering intent</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px]"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <LayoutList size={14} className="mr-2" />
              Timeline
            </Button>
            <Badge variant="primary">Gemini 1.5 Flash</Badge>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                <Bot size={24} />
              </div>
              <p className="text-sm text-slate-500 font-mono max-w-xs">
                I am your engineering partner. Ask me to analyze the project, plan a feature, or review code.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`mt-1 p-1.5 rounded-md ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-mint/10 text-mint'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {msg.role === 'assistant' ? (
                  <AIProposalSurface className="p-4">
                    <p className="text-sm font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </AIProposalSurface>
                ) : (
                  <div className="p-3 bg-surface-1 border border-white/5 rounded-xl">
                    <p className="text-sm text-slate-300">{msg.content}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-md bg-mint/10 text-mint">
                  <Bot size={14} />
                </div>
                <ActivityIndicator label="Thinking..." />
              </div>
            </div>
          )}
        </div>

        <footer className="p-6 bg-ink border-t border-white/5">
          <div className="max-w-3xl mx-auto relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your intent..."
              className="pr-12 h-12 bg-surface-1 border-white/10 focus-visible:ring-mint/50"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-mint hover:bg-mint/10"
            >
              <Send size={18} />
            </Button>
          </div>
        </footer>
      </div>

      <div className="w-[320px] h-full flex flex-col bg-ink">
        {activePersona && (
          <div className="p-6 border-b border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Expert</h3>
              <Badge variant="primary">v{activePersona.version}</Badge>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-mint">{activePersona.name}</h4>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">{activePersona.identity}</p>
            </div>

            <div className="pt-2">
              <p className="text-[9px] font-black uppercase text-slate-600 mb-2">Thinking Framework</p>
              <ul className="space-y-1.5">
                {activePersona.thinkingFramework.map((step, i) => (
                  <li key={i} className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-white/5 flex items-center justify-center text-[8px] text-mint">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {showTimeline && (
          <div className="flex-grow p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <ExecutionTimeline tasks={tasks} />
          </div>
        )}
      </div>
    </div>
  );
}
