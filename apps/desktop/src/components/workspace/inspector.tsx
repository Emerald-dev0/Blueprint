'use client';

import * as React from 'react';
import { Check, Copy, File, Folder, MousePointerClick } from 'lucide-react';
import { api } from '@/lib/ipc';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * The right-hand wing.
 *
 * It used to contain a single word - "Inspector" - in a panel that could be
 * toggled open from the header, which implied inspection of something. It now
 * shows what the explorer has selected: the entry's name, kind, project-relative
 * path and absolute path, with a copy affordance. When nothing is selected it
 * says so rather than inventing details.
 */
export function Inspector() {
  const { selection } = useWorkspaceStore();
  const [projectPath, setProjectPath] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<'idle' | 'copied' | 'failed'>('idle');

  React.useEffect(() => {
    let cancelled = false;
    api
      .getProjectPath()
      .then((path) => !cancelled && setProjectPath(path))
      .catch(() => !cancelled && setProjectPath(null));
    return () => {
      cancelled = true;
    };
  }, [selection]);

  React.useEffect(() => setCopied('idle'), [selection]);

  const absolutePath = React.useMemo(() => {
    if (!selection || !projectPath) return null;
    const separator = projectPath.includes('\\') && !projectPath.includes('/') ? '\\' : '/';
    const root = projectPath.endsWith(separator) ? projectPath.slice(0, -1) : projectPath;
    return `${root}${separator}${selection.path.split('/').join(separator)}`;
  }, [selection, projectPath]);

  const copyPath = async () => {
    if (!absolutePath) return;
    try {
      await navigator.clipboard.writeText(absolutePath);
      setCopied('copied');
    } catch {
      // The webview can refuse clipboard access; the path stays selectable below.
      setCopied('failed');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 text-right text-xs font-mono uppercase tracking-widest text-slate-500">
        Inspector
      </div>

      {!selection ? (
        <div className="space-y-3 px-6 py-10 text-center">
          <MousePointerClick size={22} className="mx-auto text-slate-700" />
          <p className="font-mono text-[11px] leading-relaxed text-slate-600">
            Select a file or directory in the explorer to inspect it.
          </p>
        </div>
      ) : (
        <div className="space-y-5 px-4 pb-6">
          <div className="flex items-start gap-2">
            {selection.kind === 'directory' ? (
              <Folder size={16} className="mt-0.5 shrink-0 text-slate-500" />
            ) : (
              <File size={16} className="mt-0.5 shrink-0 text-slate-500" />
            )}
            <div className="min-w-0 space-y-1">
              <p className="break-words text-xs font-bold text-white">{selection.name}</p>
              <p className="font-mono text-[10px] uppercase text-slate-600">
                {selection.kind}
              </p>
            </div>
          </div>

          <Field label="Project path" value={selection.path} />
          {absolutePath && <Field label="Absolute path" value={absolutePath} />}
          {!projectPath && (
            <p className="font-mono text-[10px] leading-relaxed text-slate-600">
              The open project could not be resolved, so only the relative path is known.
            </p>
          )}

          {absolutePath && (
            <button
              type="button"
              onClick={copyPath}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-400 transition-colors hover:border-[#00FF9D]/30 hover:text-[#00FF9D]"
            >
              {copied === 'copied' ? <Check size={12} /> : <Copy size={12} />}
              {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy blocked' : 'Copy path'}
            </button>
          )}

          {copied === 'failed' && (
            <p className="font-mono text-[10px] leading-relaxed text-slate-600">
              The webview refused clipboard access. Select the path above to copy it manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </span>
      <p className="select-all break-all rounded border border-white/5 bg-white/[0.02] p-2 font-mono text-[10px] leading-relaxed text-slate-400">
        {value}
      </p>
    </div>
  );
}
