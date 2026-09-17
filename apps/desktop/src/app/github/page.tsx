'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  Check,
  Copy,
  GitBranch,
  Github,
  Lock,
  RefreshCw,
  Search,
  Star,
  Tag,
} from 'lucide-react';
import { Badge, Button, Input } from '@blueprint/ui';
import type { GitHubRepository } from '@blueprint/types';
import { api, type GitStatusReport, type RepoReport } from '../../lib/ipc';
import { formatDate, relativeTime } from '../../lib/tree';
import { ROUTES } from '../../lib/routes';

/**
 * GitHub and the local git state of the open project.
 *
 * What this page used to show, and what it shows now:
 *
 * - "Engineering Velocity": Open PRs 12, Build Success 98%, Avg Review Time
 *   4.2h. All three were string literals in the JSX. Nothing in Blueprint reads
 *   pull requests, CI runs or review timestamps - there is no command that
 *   could. Replaced by a footprint derived from the repositories actually
 *   returned by the API call.
 * - "Security Guard": "monitoring 5 repositories for secret exposure", with a
 *   "Run Full Audit" button that had no handler. Blueprint does redact secrets
 *   before sending anything to a provider, but that happens in the AI path, not
 *   here, and it does not monitor repositories. Replaced by the real repository
 *   scan (`start_repo_analysis`), which reports the stack it detected.
 * - The repository search box was not connected to any state, and the external
 *   link button on each card had no handler - and no `href`, since opening an
 *   external browser from a Tauri webview needs the opener plugin, which is not
 *   a dependency. Search now filters the list; the button copies the URL.
 * - `list_github_repositories` was mapped by hand and read two fields that do
 *   not exist on the wire (`r.url`, `r.stars`), so links and star counts were
 *   `undefined`. The mapping lives in `@blueprint/git-engine` now, under test.
 * - Local git state was missing entirely, although `get_git_status` and
 *   `generate_github_release_notes` were implemented in the Rust core.
 */
export default function GitHubPage() {
  const [repos, setRepos] = React.useState<GitHubRepository[]>([]);
  const [repoError, setRepoError] = React.useState<string | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const [git, setGit] = React.useState<GitStatusReport | null>(null);
  const [gitError, setGitError] = React.useState<string | null>(null);
  const [isLoadingGit, setIsLoadingGit] = React.useState(true);

  const [tag, setTag] = React.useState('');
  const [notes, setNotes] = React.useState<string | null>(null);
  const [notesError, setNotesError] = React.useState<string | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = React.useState(false);
  const [notesCopied, setNotesCopied] = React.useState(false);

  const [report, setReport] = React.useState<RepoReport | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);

  const loadGitState = React.useCallback(async () => {
    setIsLoadingGit(true);
    try {
      setGit(await api.getGitStatus());
      setGitError(null);
    } catch (e) {
      setGit(null);
      setGitError(String(e));
    } finally {
      setIsLoadingGit(false);
    }
  }, []);

  React.useEffect(() => {
    void loadGitState();
  }, [loadGitState]);

  const connect = async () => {
    setIsLoadingRepos(true);
    try {
      const result = await api.listGitHubRepositories();
      setRepos(result);
      setRepoError(null);
      setIsConnected(true);
    } catch (e) {
      setRepos([]);
      setIsConnected(false);
      setRepoError(String(e));
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const generateNotes = async () => {
    setIsGeneratingNotes(true);
    setNotesCopied(false);
    try {
      // An empty tag makes the core fall back to HEAD, which is what "notes for
      // everything reachable from here" means.
      setNotes(await api.generateReleaseNotes(tag.trim() || 'HEAD'));
      setNotesError(null);
    } catch (e) {
      setNotes(null);
      setNotesError(String(e));
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const copyNotes = async () => {
    if (!notes) return;
    try {
      await navigator.clipboard.writeText(notes);
      setNotesCopied(true);
    } catch {
      setNotesCopied(false);
    }
  };

  const scan = async () => {
    setIsScanning(true);
    try {
      setReport(await api.analyzeRepo());
      setReportError(null);
    } catch (e) {
      setReport(null);
      setReportError(String(e));
    } finally {
      setIsScanning(false);
    }
  };

  const visibleRepos = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return repos;
    // Reusing the tree filter would be wrong (different shape); this is a flat
    // list, so a plain predicate is the honest implementation.
    return repos.filter((repo) =>
      [repo.fullName, repo.name, repo.description ?? '', repo.language ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [repos, query]);

  const footprint = React.useMemo(() => {
    const languages = new Map<string, number>();
    for (const repo of repos) {
      if (!repo.language) continue;
      languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1);
    }
    const topLanguages = [...languages.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([language]) => language);
    const mostStarred = repos.reduce<GitHubRepository | null>(
      (best, repo) => (!best || repo.stars > best.stars ? repo : best),
      null
    );
    return {
      total: repos.length,
      private: repos.filter((repo) => repo.isPrivate).length,
      topLanguages,
      mostStarred,
    };
  }, [repos]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#00FF9D]">
            <Github size={20} />
            <h1 className="text-2xl font-black uppercase italic tracking-tight">GitHub</h1>
          </div>
          <p className="font-mono text-xs text-slate-500">
            The open repository&apos;s git state, release notes from real history, and your
            GitHub repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#00FF9D]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                {repos.length} repositories
              </span>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={connect} disabled={isLoadingRepos}>
              {isLoadingRepos ? <RefreshCw size={13} className="mr-2 animate-spin" /> : null}
              Load my repositories
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* --- local git state ------------------------------------------- */}
          <section className="space-y-5 rounded-2xl border border-white/5 bg-[#141414] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <GitBranch size={15} />
                <h2 className="text-[10px] font-black uppercase tracking-widest">
                  Local repository
                </h2>
              </div>
              <button
                type="button"
                onClick={loadGitState}
                disabled={isLoadingGit}
                aria-label="Refresh git state"
                className="rounded p-1 text-slate-600 transition-colors hover:bg-white/5 hover:text-[#00FF9D]"
              >
                <RefreshCw size={13} className={isLoadingGit ? 'animate-spin' : undefined} />
              </button>
            </div>

            {git ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-[#00FF9D]/20 text-[#00FF9D]">
                    {git.branch}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-[9px] text-slate-400">
                    {git.is_clean ? 'working tree clean' : `${git.files.length} changed files`}
                  </Badge>
                  {(git.ahead > 0 || git.behind > 0) && (
                    <Badge variant="outline" className="border-white/10 text-[9px] text-slate-400">
                      {git.ahead} ahead · {git.behind} behind upstream
                    </Badge>
                  )}
                </div>

                <p className="font-mono text-[10px] text-slate-600">{git.repository_root}</p>

                {git.ahead === 0 && git.behind === 0 && (
                  <p className="font-mono text-[10px] leading-relaxed text-slate-600">
                    No upstream is configured for this branch, so ahead/behind cannot be measured.
                  </p>
                )}

                {git.files.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      Changed files
                    </h3>
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      {git.files.map((file) => (
                        <li key={file.path} className="flex items-center justify-between gap-3">
                          <span className="truncate font-mono text-[10px] text-slate-400">
                            {file.path}
                          </span>
                          <span className="shrink-0 font-mono text-[9px] uppercase text-slate-600">
                            {file.state}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {git.recent_commits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      Recent commits
                    </h3>
                    <ul className="space-y-2">
                      {git.recent_commits.map((commit) => (
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
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-mono text-[11px] leading-relaxed text-slate-500">
                  {isLoadingGit ? 'Reading git state...' : (gitError ?? 'No git state available.')}
                </p>
                <Link
                  href={ROUTES.projects}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#00FF9D]"
                >
                  Open a repository
                </Link>
              </div>
            )}
          </section>

          {/* --- release notes --------------------------------------------- */}
          <section className="space-y-4 rounded-2xl border border-white/5 bg-[#141414] p-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Tag size={15} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">Release notes</h2>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-slate-500">
              Groups the last 200 commits reachable from a tag by conventional-commit prefix.
              Leave the tag empty to start from HEAD.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="v0.1.0"
                aria-label="Tag to start release notes from"
                className="h-9 w-40 border-white/5 bg-[#0B0B0B] font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={generateNotes}
                disabled={isGeneratingNotes}
              >
                {isGeneratingNotes ? 'Drafting...' : 'Draft notes'}
              </Button>
              {notes && (
                <Button variant="ghost" size="sm" onClick={copyNotes}>
                  {notesCopied ? <Check size={13} className="mr-2" /> : <Copy size={13} className="mr-2" />}
                  {notesCopied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>

            {notesError && <p className="font-mono text-[11px] text-red-400">{notesError}</p>}

            {notes && (
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-[#0B0B0B] p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                {notes}
              </pre>
            )}
          </section>

          {/* --- remote repositories --------------------------------------- */}
          <section className="space-y-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter repositories by name, description or language..."
                aria-label="Filter repositories"
                disabled={!isConnected}
                className="h-12 border-white/5 bg-[#141414] pl-10"
              />
            </div>

            {repoError && (
              <div className="space-y-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <p className="font-mono text-[11px] leading-relaxed text-red-300">{repoError}</p>
                <Link
                  href={ROUTES.settings}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#00FF9D]"
                >
                  Settings → GitHub
                </Link>
              </div>
            )}

            {isLoadingRepos && repos.length === 0 && (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5"
                  />
                ))}
              </div>
            )}

            {isConnected && visibleRepos.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/5 p-8 text-center font-mono text-xs text-slate-500">
                {query.trim()
                  ? `No repository matches “${query.trim()}”.`
                  : 'Your account has no repositories, or the token cannot see any.'}
              </p>
            )}

            <div className="grid gap-4">
              {visibleRepos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </section>
        </div>

        {/* --- right column ------------------------------------------------- */}
        <aside className="space-y-8">
          <section className="space-y-5 rounded-2xl border border-white/5 bg-[#141414] p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">
                Repository footprint
              </h2>
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <Stat label="Repositories loaded" value={footprint.total} />
                <Stat label="Private" value={footprint.private} />
                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-tight text-slate-500">
                    Most common languages
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {footprint.topLanguages.length > 0 ? (
                      footprint.topLanguages.map((language) => (
                        <Badge key={language} variant="outline" className="border-white/10 text-[9px] text-slate-400">
                          {language}
                        </Badge>
                      ))
                    ) : (
                      <span className="font-mono text-[10px] text-slate-600">None reported</span>
                    )}
                  </div>
                </div>
                {footprint.mostStarred && footprint.mostStarred.stars > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-tight text-slate-500">
                      Most starred
                    </span>
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      <Star size={11} className="text-amber-400" />
                      {footprint.mostStarred.fullName} · {footprint.mostStarred.stars}
                    </p>
                  </div>
                )}
                <p className="font-mono text-[9px] leading-relaxed text-slate-600">
                  Derived from the 50 most recently updated repositories your token can see.
                </p>
              </div>
            ) : (
              <p className="font-mono text-[11px] leading-relaxed text-slate-500">
                Load your repositories to see this. Blueprint stores the token in your operating
                system credential store and sends it only to api.github.com.
              </p>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-white/5 bg-[#141414] p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Search size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">
                Open project scan
              </h2>
            </div>

            <Button variant="outline" size="sm" onClick={scan} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Scan the open project'}
            </Button>

            {reportError && <p className="font-mono text-[11px] text-red-400">{reportError}</p>}

            {report && (
              <div className="space-y-3">
                <Stat label="Files scanned" value={report.files_scanned} />
                <StackRow label="Languages" values={report.stack.languages} />
                <StackRow label="Frontend" values={report.stack.frontend} />
                <StackRow label="Backend" values={report.stack.backend} />
                <StackRow label="Database" values={report.stack.database} />
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function RepoCard({ repo }: { repo: GitHubRepository }) {
  const [copied, setCopied] = React.useState(false);

  /**
   * Opening a browser from a Tauri webview needs the opener plugin, which is not
   * a dependency, so an external-link button here would silently do nothing.
   * Copying the URL works and says whether it did.
   */
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(repo.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#141414] p-5 transition-all hover:border-[#00FF9D]/30">
      <div className="flex min-w-0 items-center gap-4">
        <div className="rounded-xl bg-white/5 p-2.5 text-slate-500 transition-colors group-hover:text-[#00FF9D]">
          <Github size={20} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold tracking-tight text-white">{repo.name}</h3>
            {repo.isPrivate && (
              <Lock size={11} className="shrink-0 text-slate-600" aria-label="Private repository" />
            )}
            {repo.language && (
              <Badge variant="outline" className="shrink-0 border-white/10 text-[8px] text-slate-500">
                {repo.language}
              </Badge>
            )}
          </div>
          <p className="truncate font-mono text-[10px] text-slate-600">{repo.fullName}</p>
          <p className="truncate font-mono text-[11px] text-slate-500">
            {repo.description || 'No description.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            <Star size={10} className="text-amber-400" />
            {repo.stars}
          </span>
          <span className="font-mono text-[9px] uppercase text-slate-600">
            Updated {formatDate(repo.updatedAt)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-600 hover:text-white"
          onClick={copyUrl}
          aria-label={copied ? 'Repository URL copied' : 'Copy repository URL'}
          title={repo.url}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-tight text-slate-500">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}

function StackRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="space-y-1">
      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">{label}</span>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={value} variant="outline" className="border-white/10 text-[9px] text-slate-400">
              {value}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="font-mono text-[10px] text-slate-600">None detected</p>
      )}
    </div>
  );
}
