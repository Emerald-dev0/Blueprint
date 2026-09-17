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
import { ShieldCheck, Key, Github, Sparkles } from 'lucide-react';
import { api, type PluginManifest } from '../../lib/ipc';

interface ProviderKeyInputProps {
  name: string;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  status?: string;
}

export default function SettingsPage() {
  const [plugins, setPlugins] = React.useState<PluginManifest[]>([]);
  const [pluginError, setPluginError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .listInstalledPlugins()
      .then(setPlugins)
      .catch((e) => setPluginError(String(e)));
  }, []);
  const [keys, setKeys] = React.useState({
    gemini: '',
    anthropic: '',
    openai: ''
  });
  const [status, setStatus] = React.useState<Record<string, string>>({});

  // GitHub token. The Rust credential store refuses to list repositories until
  // one exists and its error says "Add one in Settings -> GitHub", so this tab
  // has to actually accept one. It used to be a disabled button under the text
  // "GitHub integration is currently being scaffolded", which sent the user to a
  // dead end for a feature that was already implemented.
  const [token, setToken] = React.useState('');
  const [tokenStatus, setTokenStatus] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [isSavingToken, setIsSavingToken] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [visibleRepos, setVisibleRepos] = React.useState<number | null>(null);

  const saveToken = async () => {
    setIsSavingToken(true);
    setTokenError(null);
    try {
      await api.setGitHubCredential(token.trim());
      // Clear the field: the token now lives in the OS credential store, and
      // keeping it in renderer state would only widen its exposure.
      setToken('');
      setTokenStatus('Saved');
      setTimeout(() => setTokenStatus(null), 2000);
    } catch (e) {
      setTokenStatus(null);
      setTokenError(String(e));
    } finally {
      setIsSavingToken(false);
    }
  };

  const verifyToken = async () => {
    setIsVerifying(true);
    setTokenError(null);
    try {
      const repos = await api.listGitHubRepositories();
      setVisibleRepos(repos.length);
    } catch (e) {
      setVisibleRepos(null);
      setTokenError(String(e));
    } finally {
      setIsVerifying(false);
    }
  };

  const saveKey = async (provider: string) => {
    try {
      await api.setAiCredential(provider, (keys as Record<string, string>)[provider]);
      setStatus(prev => ({ ...prev, [provider]: 'Saved' }));
      setTimeout(() => setStatus(prev => ({ ...prev, [provider]: '' })), 2000);
    } catch {
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
          <TabsTrigger value="ai" className="data-[state=active]:bg-[#00FF9D]/10">AI Providers</TabsTrigger>
          <TabsTrigger value="github" className="data-[state=active]:bg-[#00FF9D]/10">GitHub</TabsTrigger>
          <TabsTrigger value="plugins" className="data-[state=active]:bg-[#00FF9D]/10">Installed</TabsTrigger>
          <TabsTrigger value="marketplace" className="data-[state=active]:bg-[#00FF9D]/10">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-8 animate-in fade-in duration-300">
          <section className="space-y-6">
            <div className="flex items-center space-x-2 text-[#00FF9D]">
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
            <ShieldCheck size={24} className="text-[#00FF9D] opacity-50" />
          </section>
        </TabsContent>

        <TabsContent value="github" className="space-y-8 animate-in fade-in duration-300">
          <section className="space-y-5">
            <div className="flex items-center space-x-2 text-[#00FF9D]">
              <Github size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">Personal access token</h3>
            </div>

            <p className="max-w-2xl font-mono text-xs leading-relaxed text-slate-500">
              Blueprint stores the token in your operating system credential store - not in a
              config file - and sends it only to api.github.com. Its audit log records the byte
              length of what was stored, never the token. A read-only token with the{' '}
              <span className="text-slate-300">repo</span> scope is enough for everything
              implemented today.
            </p>

            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#141414] p-4 transition-all hover:border-white/10">
              <div className="space-y-1">
                <label
                  htmlFor="github-token"
                  className="text-[10px] font-black uppercase tracking-tighter text-slate-500"
                >
                  GitHub token
                </label>
                <Input
                  id="github-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  autoComplete="off"
                  className="h-8 w-64 border-none bg-transparent p-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center space-x-2">
                {tokenStatus && (
                  <span className="font-mono text-[10px] text-[#00FF9D]">{tokenStatus}</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={saveToken}
                  disabled={isSavingToken || token.trim().length === 0}
                >
                  Save token
                </Button>
              </div>
            </div>

            {tokenError && <p className="font-mono text-xs text-red-400">{tokenError}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={verifyToken} disabled={isVerifying}>
                {isVerifying ? 'Checking...' : 'Check that it works'}
              </Button>
              {visibleRepos !== null && (
                <span className="font-mono text-xs text-slate-400">
                  {visibleRepos} {visibleRepos === 1 ? 'repository' : 'repositories'} visible to
                  this token
                </span>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-6">
            <h4 className="text-sm font-bold text-white">What the token is used for</h4>
            <ul className="space-y-1 font-mono text-xs text-slate-500">
              <li>· Listing your repositories on the GitHub page.</li>
              <li>
                · Nothing else yet. Issues, pull requests, commits and pushes are not implemented
                in the core, so no command can act on your behalf.
              </li>
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-6 animate-in fade-in duration-300">
          {pluginError && <p className="text-xs text-red-400 font-mono">{pluginError}</p>}
          {/* Manifests are read from the Rust plugin manager. There is no
              enable/disable/uninstall command in the core, so the panel does not
              offer one - the previous "Disable" button had no handler. */}
          <div className="grid gap-4">
            {plugins.length === 0 ? (
              <p className="text-sm text-slate-500 font-mono text-center py-12 border border-dashed border-white/5 rounded-2xl">No plugins installed.</p>
            ) : (
              plugins.map((plugin) => (
                <div key={plugin.id} className="p-6 bg-[#141414] border border-white/5 rounded-2xl flex items-start justify-between">
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
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="animate-in fade-in duration-300">
          <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center space-y-4">
            <Sparkles size={32} className="mx-auto text-[#00FF9D]/40" />
            <p className="text-slate-400 font-mono text-sm">
              The community marketplace is not live yet. Nothing is listed here because no
              registry exists to list from.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


function ProviderKeyInput({ name, value, onChange, onSave, status }: ProviderKeyInputProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-xl transition-all hover:border-white/10">
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
        {status && <span className={`text-[10px] font-mono ${status === 'Error' ? 'text-red-500' : 'text-[#00FF9D]'}`}>{status}</span>}
        <Button size="sm" variant="ghost" onClick={onSave} className="h-8">Save Key</Button>
      </div>
    </div>
  );
}
