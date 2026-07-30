'use client';

import * as React from 'react';
import {
  Badge,
  Button,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@blueprint/ui';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Github,
  Key,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { invoke, describeError, isDesktop } from '../../lib/ipc';
import { usePluginStore } from '../../store/plugins';

// Mirrors the Rust `AuthKind` / `ProviderDescriptor` / `RoutingConfig` types.
type AuthKind =
  | { kind: 'api_key'; signup_url: string }
  | { kind: 'local_endpoint'; default_endpoint: string };

interface ModelInfo {
  id: string;
  display_name: string;
  context_window: number | null;
}

interface ProviderDescriptor {
  id: string;
  display_name: string;
  auth: AuthKind;
  configured: boolean;
  default_models: ModelInfo[];
}

type Capability =
  | 'reasoning'
  | 'architecture'
  | 'coding'
  | 'function_calling'
  | 'large_context'
  | 'multimodal'
  | 'offline'
  | 'private';

interface RouteTarget {
  provider_id: string;
  model_id: string;
}

interface RoutingConfig {
  default: RouteTarget;
  overrides: Partial<Record<Capability, RouteTarget>>;
}

const CAPABILITIES: { id: Capability; label: string; hint: string }[] = [
  { id: 'reasoning', label: 'Reasoning', hint: 'Planning, analysis, review' },
  { id: 'architecture', label: 'Architecture', hint: 'System and API design' },
  { id: 'coding', label: 'Coding', hint: 'Implementation and edits' },
  { id: 'function_calling', label: 'Tool use', hint: 'Structured tool calls' },
  { id: 'large_context', label: 'Large context', hint: 'Whole-repository reads' },
  { id: 'multimodal', label: 'Multimodal', hint: 'Images and documents' },
  { id: 'offline', label: 'Offline', hint: 'No network egress' },
  { id: 'private', label: 'Private', hint: 'Code that must not leave the machine' },
];

type ProbeState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; models: number }
  | { status: 'error'; message: string };

export default function SettingsPage() {
  const { plugins } = usePluginStore();

  const [providers, setProviders] = React.useState<ProviderDescriptor[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [routing, setRouting] = React.useState<RoutingConfig | null>(null);
  const [probes, setProbes] = React.useState<Record<string, ProbeState>>({});
  const [models, setModels] = React.useState<Record<string, ModelInfo[]>>({});

  const load = React.useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const [list, route] = await Promise.all([
        invoke<ProviderDescriptor[]>('list_ai_providers'),
        invoke<RoutingConfig>('get_ai_routing'),
      ]);
      setProviders(list);
      setRouting(route);
      setModels(Object.fromEntries(list.map((p) => [p.id, p.default_models])));
      setLoadState('ready');
    } catch (e) {
      setLoadError(describeError(e));
      setLoadState('error');
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const probe = async (providerId: string) => {
    setProbes((p) => ({ ...p, [providerId]: { status: 'checking' } }));
    try {
      await invoke('check_ai_provider', { providerId });
      const found = await invoke<ModelInfo[]>('list_provider_models', { providerId });
      setModels((m) => ({ ...m, [providerId]: found }));
      setProbes((p) => ({ ...p, [providerId]: { status: 'ok', models: found.length } }));
    } catch (e) {
      setProbes((p) => ({
        ...p,
        [providerId]: { status: 'error', message: describeError(e) },
      }));
    }
  };

  const saveRouting = async (next: RoutingConfig) => {
    setRouting(next);
    try {
      await invoke('set_ai_routing', { config: next });
    } catch (e) {
      setLoadError(describeError(e));
    }
  };

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Settings</h1>
        <p className="text-slate-500 font-mono text-sm">
          Configure your engineering intelligence layer.
        </p>
      </header>

      {!isDesktop() && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl border border-warning/20 bg-warning/[0.04]"
        >
          <MonitorSmartphone size={18} className="text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Running in a browser. Provider configuration needs the desktop shell — start it with{' '}
            <code className="px-1 py-0.5 rounded bg-white/5">pnpm tauri:dev</code>.
          </p>
        </div>
      )}

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="bg-white/5 border border-edge p-1 mb-8">
          <TabsTrigger value="providers" className="data-[state=active]:bg-mint/10">
            Providers
          </TabsTrigger>
          <TabsTrigger value="routing" className="data-[state=active]:bg-mint/10">
            Routing
          </TabsTrigger>
          <TabsTrigger value="github" className="data-[state=active]:bg-mint/10">
            GitHub
          </TabsTrigger>
          <TabsTrigger value="plugins" className="data-[state=active]:bg-mint/10">
            Plugins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-mint">
              <Key size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">
                Intelligence providers
              </h3>
            </div>
            <Button variant="ghost" size="sm" onClick={load} className="h-8 gap-2">
              <RefreshCw size={13} />
              Refresh
            </Button>
          </div>

          {loadState === 'loading' && <ProviderSkeleton />}

          {loadState === 'error' && (
            <ErrorPanel message="Could not load providers." detail={loadError} onRetry={load} />
          )}

          {loadState === 'ready' &&
            providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                models={models[provider.id] ?? []}
                probe={probes[provider.id] ?? { status: 'idle' }}
                onProbe={() => probe(provider.id)}
                onChanged={load}
              />
            ))}

          <Separator />

          <section className="p-6 bg-white/5 border border-edge rounded-2xl flex items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Credential storage</h4>
              <p className="text-xs text-slate-500 font-mono">
                Keys live in your OS keychain. Blueprint never writes them to disk or syncs them.
              </p>
            </div>
            <ShieldCheck size={24} className="text-mint opacity-50 shrink-0" />
          </section>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-mint">
              Capability routing
            </h3>
            <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-2xl">
              Blueprint breaks work into tasks and picks a model per task. Choose which provider
              serves each capability — anything left on Default uses your default provider.
            </p>
          </div>

          {loadState === 'loading' && <ProviderSkeleton />}

          {loadState === 'error' && (
            <ErrorPanel message="Could not load routing." detail={loadError} onRetry={load} />
          )}

          {loadState === 'ready' && routing && (
            <div className="space-y-4">
              <RouteRow
                label="Default"
                hint="Used for every capability without an override"
                providers={providers}
                models={models}
                value={routing.default}
                onChange={(target) => saveRouting({ ...routing, default: target })}
              />

              <Separator />

              {CAPABILITIES.map((cap) => (
                <RouteRow
                  key={cap.id}
                  label={cap.label}
                  hint={cap.hint}
                  providers={providers}
                  models={models}
                  value={routing.overrides[cap.id]}
                  clearable
                  onChange={(target) =>
                    saveRouting({
                      ...routing,
                      overrides: { ...routing.overrides, [cap.id]: target },
                    })
                  }
                  onClear={() => {
                    const next = { ...routing.overrides };
                    delete next[cap.id];
                    saveRouting({ ...routing, overrides: next });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="github" className="animate-in fade-in duration-300">
          <GitHubPanel />
        </TabsContent>

        <TabsContent value="plugins" className="space-y-6 animate-in fade-in duration-300">
          {plugins.length === 0 ? (
            <p className="text-sm text-slate-500 font-mono text-center py-12 border border-dashed border-edge rounded-2xl">
              No plugins installed.
            </p>
          ) : (
            <div className="grid gap-4">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="p-6 bg-surface-1 border border-edge rounded-2xl flex items-start justify-between gap-6"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{plugin.name}</h4>
                      <Badge variant="outline">v{plugin.version}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-md">
                      {plugin.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plugin.permissions.map((p) => (
                        <span
                          key={p}
                          className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400 font-mono uppercase"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-error/10 shrink-0"
                  >
                    Disable
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProviderCard({
  provider,
  models,
  probe,
  onProbe,
  onChanged,
}: {
  provider: ProviderDescriptor;
  models: ModelInfo[];
  probe: ProbeState;
  onProbe: () => void;
  onChanged: () => void;
}) {
  const [key, setKey] = React.useState('');
  const [endpoint, setEndpoint] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isLocal = provider.auth.kind === 'local_endpoint';
  const defaultEndpoint =
    provider.auth.kind === 'local_endpoint' ? provider.auth.default_endpoint : '';

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isLocal) {
        await invoke('set_provider_endpoint', {
          providerId: provider.id,
          endpoint: endpoint.trim() || null,
        });
      } else {
        await invoke('set_ai_credential', { providerId: provider.id, key });
        setKey('');
      }
      onChanged();
      onProbe();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setError(null);
    try {
      await invoke('delete_ai_credential', { providerId: provider.id });
      setKey('');
      onChanged();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="p-6 bg-surface-1 border border-edge rounded-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white">{provider.display_name}</h4>
            {isLocal ? (
              <Badge variant="outline" className="text-[9px]">
                Local
              </Badge>
            ) : provider.configured ? (
              <Badge variant="outline" className="text-[9px] border-mint/30 text-mint">
                Key saved
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] text-slate-500">
                Not configured
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {isLocal
              ? `Expects a local server at ${defaultEndpoint}`
              : 'Key is stored in your OS keychain'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ProbeBadge probe={probe} />
          <Button variant="ghost" size="sm" onClick={onProbe} className="h-8">
            Test
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type={isLocal ? 'text' : 'password'}
          value={isLocal ? endpoint : key}
          onChange={(e) => (isLocal ? setEndpoint(e.target.value) : setKey(e.target.value))}
          placeholder={isLocal ? defaultEndpoint : 'Paste API key…'}
          className="bg-ink border-edge h-9 font-mono text-xs"
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={save}
          disabled={busy || (!isLocal && !key.trim())}
          className="h-9 shrink-0"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
        </Button>
        {!isLocal && provider.configured && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={busy}
            className="h-9 shrink-0 text-slate-500 hover:text-error"
            aria-label={`Remove ${provider.display_name} key`}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-error font-mono">
          {error}
        </p>
      )}

      {probe.status === 'error' && (
        <p role="alert" className="text-[11px] text-error/80 font-mono leading-relaxed">
          {probe.message}
        </p>
      )}

      {models.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {models.slice(0, 6).map((m) => (
            <span
              key={m.id}
              className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400 font-mono"
            >
              {m.id}
            </span>
          ))}
          {models.length > 6 && (
            <span className="text-[9px] px-1.5 py-0.5 text-slate-600 font-mono">
              +{models.length - 6} more
            </span>
          )}
        </div>
      )}

      {provider.auth.kind === 'api_key' && !provider.configured && (
        <a
          href={provider.auth.signup_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-mint transition-colors"
        >
          Get a key
          <ExternalLink size={10} />
        </a>
      )}
    </section>
  );
}

function ProbeBadge({ probe }: { probe: ProbeState }) {
  if (probe.status === 'checking') {
    return <Loader2 size={14} className="animate-spin text-slate-500" />;
  }
  if (probe.status === 'ok') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-mint">
        <Check size={12} />
        {probe.models} model{probe.models === 1 ? '' : 's'}
      </span>
    );
  }
  if (probe.status === 'error') {
    return <AlertTriangle size={14} className="text-error" />;
  }
  return null;
}

function RouteRow({
  label,
  hint,
  providers,
  models,
  value,
  clearable,
  onChange,
  onClear,
}: {
  label: string;
  hint: string;
  providers: ProviderDescriptor[];
  models: Record<string, ModelInfo[]>;
  value?: RouteTarget;
  clearable?: boolean;
  onChange: (target: RouteTarget) => void;
  onClear?: () => void;
}) {
  const providerId = value?.provider_id ?? '';
  const available = models[providerId] ?? [];

  const selectClass =
    'h-9 rounded-md bg-ink border border-edge px-2 text-xs font-mono text-slate-300 ' +
    'focus:outline-none focus:ring-2 focus:ring-mint/40 disabled:opacity-40';

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <span className="text-xs font-bold text-slate-300">{label}</span>
        <p className="text-[10px] text-slate-600 font-mono">{hint}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          aria-label={`${label} provider`}
          className={selectClass}
          value={providerId}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            const first = models[id]?.[0]?.id ?? '';
            onChange({ provider_id: id, model_id: first });
          }}
        >
          <option value="">{clearable ? 'Default' : 'Select…'}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>

        <select
          aria-label={`${label} model`}
          className={`${selectClass} w-52`}
          value={value?.model_id ?? ''}
          disabled={!providerId}
          onChange={(e) => onChange({ provider_id: providerId, model_id: e.target.value })}
        >
          {available.length === 0 && <option value="">Run Test to discover models</option>}
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>

        {clearable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!value}
            className="h-9 text-slate-600 hover:text-slate-300"
            aria-label={`Reset ${label} to default`}
          >
            <Trash2 size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

function GitHubPanel() {
  const [token, setToken] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setState('saving');
    setError(null);
    try {
      await invoke('set_github_credential', { token });
      setToken('');
      setState('saved');
    } catch (e) {
      setError(describeError(e));
      setState('error');
    }
  };

  return (
    <section className="p-6 bg-surface-1 border border-edge rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Github size={16} className="text-slate-400" />
        <h4 className="text-sm font-bold text-white">GitHub personal access token</h4>
      </div>
      <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-xl">
        Needs <code className="px-1 bg-white/5 rounded">repo</code> scope to read repositories and
        issues, and to open pull requests. Stored in your OS keychain.
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="ghp_…"
          className="bg-ink border-edge h-9 font-mono text-xs"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={save}
          disabled={state === 'saving' || !token.trim()}
          className="h-9 shrink-0"
        >
          {state === 'saving' ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
        </Button>
      </div>
      {state === 'saved' && (
        <p className="text-[11px] text-mint font-mono flex items-center gap-1">
          <Check size={12} /> Token saved
        </p>
      )}
      {state === 'error' && error && (
        <p role="alert" className="text-[11px] text-error font-mono">
          {error}
        </p>
      )}
      <a
        href="https://github.com/settings/tokens"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-mint transition-colors"
      >
        Create a token
        <ExternalLink size={10} />
      </a>
    </section>
  );
}

function ProviderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading providers">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-6 bg-surface-1 border border-edge rounded-2xl space-y-4">
          <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-64 rounded bg-white/5 animate-pulse" />
          <div className="h-9 w-full rounded-md bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ErrorPanel({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="p-10 border border-error/20 bg-error/[0.03] rounded-2xl text-center space-y-4"
    >
      <AlertTriangle size={32} className="mx-auto text-error/60" />
      <div className="space-y-2">
        <p className="text-slate-300 font-bold uppercase tracking-tight text-sm">{message}</p>
        {detail && (
          <p className="text-xs text-slate-500 font-mono max-w-xl mx-auto leading-relaxed break-words">
            {detail}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-edge">
          Retry
        </Button>
      )}
    </div>
  );
}
