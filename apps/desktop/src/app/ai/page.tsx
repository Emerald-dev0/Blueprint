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
import { invoke } from '@tauri-apps/api/core';
import { ExecutionTimeline } from '@/components/ai/execution-timeline';
import { Task } from '@blueprint/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showTimeline, setShowTimeline] = React.useState(false);

  // Mock Tasks for Orchestration visualization
  const [tasks, setTasks] = React.useState<Task[]>([
    {
      id: '1',
      title: 'Analyze Project Intent',
      description: 'Understanding core architectural patterns.',
      roleId: 'principal',
      status: 'completed',
      output: 'Project identified as a Tauri/Next.js monorepo.'
    },
    {
      id: '2',
      title: 'Extract Schema Requirements',
      description: 'Mapping necessary data models for implementation.',
      roleId: 'architect',
      status: 'completed',
      output: 'Identified 3 core entities: Project, ADR, Task.'
    },
    {
      id: '3',
      title: 'Draft Implementation Plan',
      description: 'Creating a step-by-step roadmap.',
      roleId: 'pm',
      status: 'active'
    },
    {
      id: '4',
      title: 'Generate Core Components',
      description: 'Executing file modifications.',
      roleId: 'frontend',
      status: 'pending'
    },
  ]);

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
        content: `Error: ${error instanceof Error ? error.message : String(error)}. Have you configured your API key in Settings?`
      }]);
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
                <div className={`mt-1 p-1.5 rounded-md ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-[#00FF9D]/10 text-[#00FF9D]'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {msg.role === 'assistant' ? (
                  <AIProposalSurface className="p-4">
                    <p className="text-sm font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
              placeholder="Type your intent (e.g. 'Build a production SaaS application')..."
              className="pr-12 h-12 bg-[#141414] border-white/10 focus-visible:ring-[#00FF9D]/50"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00FF9D] hover:bg-[#00FF9D]/10"
            >
              <Send size={18} />
            </Button>
          </div>
        </footer>
      </div>

      {showTimeline && (
        <div className="w-[320px] h-full bg-[#0B0B0B] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
          <ExecutionTimeline tasks={tasks} />
        </div>
      )}
    </div>
  );
}
