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
  TabsContent
} from '@blueprint/ui';
import { ShieldCheck, Key, Github } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { usePluginStore } from '../../store/plugins';

interface ProviderKeyInputProps {
  name: string;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  status?: string;
}

interface ProviderKeyInputProps {
  name: string;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  status?: string;
}

export default function SettingsPage() {
  const { plugins } = usePluginStore();
  const [keys, setKeys] = React.useState({
    gemini: '',
    anthropic: '',
    openai: ''
  });
  const [status, setStatus] = React.useState<Record<string, string>>({});

  const saveKey = async (provider: string) => {
    try {
      await invoke('set_ai_credential', {
        providerId: provider,
        key: (keys as any)[provider]
      });
      setStatus(prev => ({ ...prev, [provider]: 'Saved' }));
      setTimeout(() => setStatus(prev => ({ ...prev, [provider]: '' })), 2000);
    } catch (e) {
      setStatus(prev => ({ ...prev, [provider]: 'Error' }));
    }
  };

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Command Settings</h1>
        <p className="text-slate-500 font-mono text-sm">Configure your engineering intelligence layer.</p>
      </header>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="bg-white/5 border border-white/5 p-1 mb-8">
          <TabsTrigger value="ai" className="data-[state=active]:bg-mint/10">AI Providers</TabsTrigger>
          <TabsTrigger value="github" className="data-[state=active]:bg-mint/10">GitHub</TabsTrigger>
          <TabsTrigger value="plugins" className="data-[state=active]:bg-mint/10">Plugins</TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-mint/10">General</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-8 animate-in fade-in duration-300">
          <section className="space-y-6">
            <div className="flex items-center space-x-2 text-mint">
              <Key size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">API Key Management</h3>
            </div>

            <div className="grid gap-4">
              <ProviderKeyInput
                name="Google Gemini"
                value={keys.gemini}
                status={status.gemini}
                onChange={(val: string) => setKeys(k => ({ ...k, gemini: val }))}
                onSave={() => saveKey('gemini')}
              />
              <ProviderKeyInput
                name="Anthropic Claude"
                value={keys.anthropic}
                status={status.anthropic}
                onChange={(val: string) => setKeys(k => ({ ...k, anthropic: val }))}
                onSave={() => saveKey('anthropic')}
              />
              <ProviderKeyInput
                name="OpenAI"
                value={keys.openai}
                status={status.openai}
                onChange={(val: string) => setKeys(k => ({ ...k, openai: val }))}
                onSave={() => saveKey('openai')}
              />
            </div>
          </section>

          <Separator />

          <section className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Privacy Seal</h4>
              <p className="text-xs text-slate-500 font-mono">Keys are stored locally in your system keychain. No cloud sync.</p>
            </div>
            <ShieldCheck size={24} className="text-mint opacity-50" />
          </section>
        </TabsContent>

        <TabsContent value="github" className="animate-in fade-in duration-300">
          <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center space-y-4">
            <Github size={32} className="mx-auto text-slate-600" />
            <p className="text-slate-400 font-mono text-sm">GitHub integration is currently being scaffolded.</p>
            <Button variant="outline" disabled>Connect GitHub</Button>
          </div>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-4">
            {plugins.length === 0 ? (
              <p className="text-sm text-slate-500 font-mono text-center py-12 border border-dashed border-white/5 rounded-2xl">No plugins installed.</p>
            ) : (
              plugins.map((plugin) => (
                <div key={plugin.id} className="p-6 bg-surface-1 border border-white/5 rounded-2xl flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{plugin.name}</h4>
                      <Badge variant="outline">v{plugin.version}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-md">{plugin.description}</p>
                    <div className="flex gap-2">
                      {plugin.permissions.map(p => (
                        <span key={p} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400 font-mono uppercase">{p}</span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">Disable</Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderKeyInput({ name, value, onChange, onSave, status }: ProviderKeyInputProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-1 border border-white/5 rounded-xl transition-all hover:border-white/10">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{name}</label>
        <Input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste API Key..."
          className="border-none bg-transparent h-8 p-0 focus-visible:ring-0 w-64"
        />
      </div>
      <div className="flex items-center space-x-2">
        {status && <span className={`text-[10px] font-mono ${status === 'Error' ? 'text-red-500' : 'text-mint'}`}>{status}</span>}
        <Button size="sm" variant="ghost" onClick={onSave} className="h-8">Save Key</Button>
      </div>
    </div>
  );
}
