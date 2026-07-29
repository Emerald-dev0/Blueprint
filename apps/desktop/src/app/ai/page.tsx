'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Badge,
  AIProposalSurface,
  ActivityIndicator
} from '@blueprint/ui';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // In a real implementation, we would use the UniversalAIProvider
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
    <div className="flex flex-col h-full bg-[#0B0B0B]">
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
        <Badge variant="primary">Gemini 1.5 Flash</Badge>
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
            placeholder="Type your intent (e.g. 'How does the auth flow work?')..."
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
  );
}
