'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  FolderKanban,
  FolderOpen,
  GitBranch,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { Badge, Button } from '@blueprint/ui';
import { api, pickProjectDirectory, type GitStatusReport, type ProjectTree } from '../lib/ipc';
import { countNodes, relativeTime } from '../lib/tree';
import { ROUTES } from '../lib/routes';
import { ShortcutHint } from '../components/shell/shortcut-hint';
import { useWorkspaceStore } from '../store/workspace';

/**
 * The project home.
 *
 * This route used to render "The {activeSystem} engine is currently in
 * development", reading a store field that no navigation ever updated - so it
 * announced that a non-existent "projects engine" was in development, on every
 * launch. Everything below comes from a command that exists: the open project
 * path, a read-only walk of its files, and `git status` for the repository.
 */
export default function ProjectHome() {
  const refreshExplorer = useWorkspaceStore((state) => state.refreshExplorer);
  const [projectPath, setProjectPath] = React.useState<string | null>(null);
  const [tree, setTree] = React.useState<ProjectTree | null>(null);
  const [git, setGit] = React.useState<GitStatusReport | null>(null);
  const [gitError, setGitError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpening, setIsOpening] = React.useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const path = await api.getProjectPath().catch(() => null);
      setProjectPath(path);
      if (!path) {
        setTree(null);
        setGit(null);
        setGitError(null);
        return;
      }

      const [treeResult, gitResult] = await Promise.allSettled([
        api.listProjectFiles(),
        api.getGitStatus(),
      ]);
      setTree(treeResult.status === 'fulfilled' ? treeResult.value : null);
      if (gitResult.status === 'fulfilled') {
        setGit(gitResult.value);
        setGitError(null);
      } else {
        setGit(null);
        setGitError(String(gitResult.reason));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openProject = async () => {
    setIsOpening(true);
    try {
      const chosen = await pickProjectDirectory();
      if (chosen) {
        refreshExplorer();
        await load();
      }
    } finally {
      setIsOpening(false);
    }
  };

  const refresh = () => {
    refreshExplorer();
    void load();
  };

  const projectName = projectPath
    ? (projectPath.split(/[/\\]/).filter(Boolean).pop() ?? projectPath)
    : null;
  const counts = tree ? countNodes(tree.nodes) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#00FF9D]">
            <FolderKanban size={20} />
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Project</h1>
          </div>
          <p className="font-mono text-xs text-slate-500">
            {projectPath ? projectPath : 'Nothing is open yet.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {projectPath && (
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw size={13} className="mr-2" />
              Refresh
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={openProject} disabled={isOpening}>
            <FolderOpen size={13} className="mr-2" />
            {projectPath ? 'Open another' : 'Open a repository'}
          </Button>
        </div>
      </header>

      {!projectPath && !isLoading ? (
        <div className="space-y-4 rounded-3xl border border-dashed border-white/10 p-12 text-center">
          <FolderOpen size={36} className="mx-auto text-slate-700" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
            Open a repository to begin
          </h2>
          <p className="mx-auto max-w-lg font-mono text-xs leading-relaxed text-slate-500">
            Blueprint reads the project you point it at: the file tree, the git state and the
            languages in use. It runs locally, writes nothing except the files you explicitly ask
            it to (memory entries, ADRs and the AGENTS.md export), and stores credentials in your
            operating system keychain.
          </p>
          <p className="font-mono text-[11px] text-slate-600">
            Press <ShortcutHint keys="K" /> for the command palette.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card
            title="Repository"
            icon={GitBranch}
            hint={gitError ? undefined : `${projectName ?? ''} on ${git?.branch ?? '—'}`}
          >
            {git ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-[#00FF9D]/20 text-[#00FF9D]">
                    {git.branch}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-[9px] text-slate-400">
                    {git.is_clean ? 'clean' : `${git.files.length} changed`}
                  </Badge>
                  {(git.ahead > 0 || git.behind > 0) && (
                    <Badge variant="outline" className="border-white/10 text-[9px] text-slate-400">
                      ↑{git.ahead} ↓{git.behind}
                    </Badge>
                  )}
                </div>

                {git.ahead === 0 && git.behind === 0 && (
                  <p className="font-mono text-[10px] leading-relaxed text-slate-600">
                    No upstream is configured for this branch, so divergence cannot be measured.
                  </p>
                )}

                {git.files.length > 0 && (
                  <ul className="space-y-1">
                    {git.files.slice(0, 5).map((file) => (
                      <li key={file.path} className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[10px] text-slate-400">
                          {file.path}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] uppercase text-slate-600">
                          {file.state}
                        </span>
                      </li>
                    ))}
                    {git.files.length > 5 && (
                      <li className="font-mono text-[9px] text-slate-600">
                        +{git.files.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <p className="font-mono text-[11px] leading-relaxed text-slate-500">
                {isLoading ? 'Reading git state...' : (gitError ?? 'No git state available.')}
              </p>
            )}
          </Card>

          <Card title="Contents" icon={Layers} hint={tree ? `${tree.maxDepth} levels walked` : undefined}>
            {counts ? (
              <div className="space-y-3">
                <dl className="space-y-2">
                  <Row label="Files" value={counts.files} />
                  <Row label="Directories" value={counts.directories} />
                  <Row label="Deepest level" value={counts.depth} />
                </dl>
                <p className="font-mono text-[10px] leading-relaxed text-slate-600">
                  {tree?.truncated
                    ? 'Capped at 2000 entries.'
                    : 'Dependency, build and cache directories are skipped.'}
                </p>
              </div>
            ) : (
              <p className="font-mono text-[11px] leading-relaxed text-slate-500">
                {isLoading ? 'Walking the project...' : 'The file tree could not be read.'}
              </p>
            )}
          </Card>

          <Card title="Recent commits" icon={Clock} hint={git ? `${git.recent_commits.length} shown` : undefined}>
            {git && git.recent_commits.length > 0 ? (
              <ul className="space-y-3">
                {git.recent_commits.slice(0, 5).map((commit) => (
                  <li key={commit.id} className="space-y-0.5">
                    <p className="truncate font-mono text-[11px] text-slate-300" title={commit.summary}>
                      {commit.summary}
                    </p>
                    <p className="font-mono text-[9px] uppercase text-slate-600">
                      {commit.id} · {commit.author} · {relativeTime(commit.time)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-[11px] leading-relaxed text-slate-500">
                {git
                  ? 'This repository has no commits yet.'
                  : 'Commit history needs a git repository.'}
              </p>
            )}
          </Card>
        </div>
      )}

      {projectPath && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            What you can do with it
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NextStep
              href={ROUTES.intelligence}
              title="Scan the stack"
              description="Detect languages and frameworks, then export AGENTS.md for OpenCode, Codex, Gemini and Claude Code."
            />
            <NextStep
              href={ROUTES.ai}
              title="Ask a persona"
              description="Run the goal through one of the operating manuals in the registry, with secrets redacted."
            />
            <NextStep
              href={ROUTES.github}
              title="Repositories and release notes"
              description="List your GitHub repositories and draft release notes from real commit history."
            />
            <NextStep
              href={ROUTES.memory}
              title="Record a decision"
              description="Store an ADR or a knowledge entry alongside the project."
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: typeof GitBranch;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/5 bg-[#141414] p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon size={14} />
          <h2 className="text-[10px] font-black uppercase tracking-widest">{title}</h2>
        </div>
        {hint && (
          <span className="truncate font-mono text-[9px] uppercase text-slate-600">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="font-mono text-[10px] uppercase tracking-tight text-slate-500">{label}</dt>
      <dd className="text-sm font-black text-white">{value}</dd>
    </div>
  );
}

function NextStep({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 rounded-2xl border border-white/5 bg-[#141414]/60 p-5 transition-colors hover:border-[#00FF9D]/30"
    >
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-tight text-white group-hover:text-[#00FF9D]">
          {title}
        </h3>
        <p className="max-w-sm font-mono text-[10px] leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
      <ArrowRight size={14} className="mt-1 shrink-0 text-slate-700 group-hover:text-[#00FF9D]" />
    </Link>
  );
}
