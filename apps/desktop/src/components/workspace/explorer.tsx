'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, pickProjectDirectory, type FileNode, type ProjectTree } from '@/lib/ipc';
import { filterTree } from '@/lib/tree';
import { Button, Input } from '@blueprint/ui';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * The project explorer.
 *
 * This panel used to render a hard-coded `mockFiles` array - `apps/`,
 * `packages/`, `README.md` and a few invented children - whether or not a
 * project was open, so it displayed files that did not exist and hid the ones
 * that did. It now walks the repository the user actually opened
 * (`list_project_files`), which skips `.git`, dependencies and build output,
 * and reports when the entry cap cut the walk short instead of implying the
 * tree is complete.
 */
export function ProjectExplorer() {
  const { selection, select, explorerNonce, refreshExplorer } = useWorkspaceStore();
  const [projectPath, setProjectPath] = React.useState<string | null>(null);
  const [tree, setTree] = React.useState<ProjectTree | null>(null);
  const [filter, setFilter] = React.useState('');
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isOpening, setIsOpening] = React.useState(false);

  const openProject = React.useCallback(async () => {
    setIsOpening(true);
    try {
      const chosen = await pickProjectDirectory();
      if (chosen) setProjectPath(chosen);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsOpening(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    api
      .getProjectPath()
      .then((path) => !cancelled && setProjectPath(path))
      .catch(() => !cancelled && setProjectPath(null));
    return () => {
      cancelled = true;
    };
  }, [explorerNonce]);

  React.useEffect(() => {
    if (!projectPath) {
      setTree(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api
      .listProjectFiles()
      .then((result) => {
        if (cancelled) return;
        setTree(result);
        // Open the first directory so the panel is not a wall of collapsed rows.
        const first = result.nodes.find((node) => node.kind === 'directory');
        setExpanded(first ? new Set([first.path]) : new Set());
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [projectPath, explorerNonce]);

  const toggle = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const nodes = React.useMemo(
    () => (tree && filter.trim() ? filterTree(tree.nodes, filter.trim()) : (tree?.nodes ?? [])),
    [tree, filter]
  );

  const projectName = projectPath
    ? (projectPath.split(/[/\\]/).filter(Boolean).pop() ?? projectPath)
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Explorer
          </h3>
          <div className="flex items-center gap-1">
            {projectPath && (
              <button
                type="button"
                onClick={refreshExplorer}
                aria-label="Refresh file tree"
                title="Re-read the project from disk"
                className="rounded p-1 text-slate-600 transition-colors hover:bg-white/5 hover:text-[#00FF9D]"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : undefined} />
              </button>
            )}
            {projectPath && (
              <button
                type="button"
                onClick={openProject}
                disabled={isOpening}
                aria-label="Open a different repository"
                title="Open a different repository"
                className="rounded p-1 text-slate-600 transition-colors hover:bg-white/5 hover:text-[#00FF9D]"
              >
                <FolderOpen size={13} />
              </button>
            )}
          </div>
        </div>

        {projectName && (
          <p className="truncate font-mono text-[10px] text-slate-600" title={projectPath ?? undefined}>
            {projectName}
          </p>
        )}

        {projectPath && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter files..."
              aria-label="Filter the file tree"
              className="h-8 border-none bg-white/5 pl-8 text-xs focus-visible:ring-offset-0"
            />
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto px-2 pb-4">
        {!projectPath && !isLoading && (
          <div className="space-y-3 px-2 py-8 text-center">
            <Folder size={24} className="mx-auto text-slate-700" />
            <p className="font-mono text-[11px] leading-relaxed text-slate-500">
              No project is open.
            </p>
            <Button variant="outline" size="sm" onClick={openProject} disabled={isOpening}>
              Open a repository
            </Button>
          </div>
        )}

        {isLoading && projectPath && (
          <div className="space-y-2 px-2 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        )}

        {error && (
          <p className="px-2 py-4 font-mono text-[11px] leading-relaxed text-red-400">{error}</p>
        )}

        {!isLoading && !error && projectPath && nodes.length === 0 && (
          <p className="px-2 py-4 font-mono text-[11px] text-slate-600">
            {filter.trim()
              ? `Nothing in this project matches “${filter.trim()}”.`
              : 'This directory is empty.'}
          </p>
        )}

        {!isLoading && !error && (
          <TreeLevel
            nodes={nodes}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            forceOpen={filter.trim().length > 0}
            selectionPath={selection?.path ?? null}
            onSelect={select}
          />
        )}
      </div>

      {tree?.truncated && (
        <p className="border-t border-white/5 px-4 py-2 font-mono text-[9px] leading-relaxed text-slate-600">
          Showing the first 2000 entries; dependency and build directories are skipped.
        </p>
      )}
    </div>
  );
}

interface TreeLevelProps {
  nodes: FileNode[];
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
  /** A filter is active: show matches even inside collapsed directories. */
  forceOpen: boolean;
  selectionPath: string | null;
  onSelect: (selection: { name: string; path: string; kind: 'file' | 'directory' }) => void;
}

function TreeLevel({
  nodes,
  depth,
  expanded,
  toggle,
  forceOpen,
  selectionPath,
  onSelect,
}: TreeLevelProps) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const isDirectory = node.kind === 'directory';
        const isOpen = forceOpen || expanded.has(node.path);
        const isSelected = selectionPath === node.path;

        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => {
                onSelect({ name: node.name, path: node.path, kind: node.kind });
                if (isDirectory && !forceOpen) toggle(node.path);
              }}
              aria-expanded={isDirectory ? isOpen : undefined}
              aria-current={isSelected ? 'true' : undefined}
              title={node.path}
              className={cn(
                'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors',
                isSelected ? 'bg-[#00FF9D]/10 text-[#00FF9D]' : 'text-slate-400 hover:bg-white/5'
              )}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
            >
              {isDirectory ? (
                isOpen ? (
                  <ChevronDown size={12} className="shrink-0 text-slate-600" />
                ) : (
                  <ChevronRight size={12} className="shrink-0 text-slate-600" />
                )
              ) : (
                <span className="w-3 shrink-0" />
              )}
              {isDirectory ? (
                <Folder size={13} className="shrink-0 text-slate-500" />
              ) : (
                <File size={13} className="shrink-0 text-slate-600" />
              )}
              <span className="truncate font-mono text-[11px]">{node.name}</span>
            </button>

            {isDirectory && isOpen && node.children && node.children.length > 0 && (
              <TreeLevel
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                forceOpen={forceOpen}
                selectionPath={selectionPath}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
