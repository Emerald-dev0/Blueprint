/**
 * Pure helpers for the project file tree and for rendering git timestamps.
 *
 * They live outside the components that use them because they are the parts
 * worth testing: the tree returned by `list_project_files` is nested, capped and
 * filtered, and off-by-one or casing mistakes in that logic are invisible in a
 * snapshot of the UI. See `tests/unit/tree.test.ts`.
 */

import type { FileNode } from './ipc';

export interface TreeCounts {
  files: number;
  directories: number;
  /** Deepest level reached, counting the top level as 1. */
  depth: number;
}

/** Count what the explorer actually received, honouring the depth cap. */
export function countNodes(nodes: FileNode[]): TreeCounts {
  let files = 0;
  let directories = 0;
  let depth = 0;

  const walk = (list: FileNode[], level: number) => {
    if (list.length > 0) depth = Math.max(depth, level);
    for (const node of list) {
      if (node.kind === 'directory') directories += 1;
      else files += 1;
      if (node.children) walk(node.children, level + 1);
    }
  };

  walk(nodes, 1);
  return { files, directories, depth };
}

/**
 * Keep a node when its own name matches the query, or when a descendant does.
 * A matching directory keeps its whole subtree: searching for `src` should show
 * what is inside it. Matching is case-insensitive.
 */
export function filterTree(nodes: FileNode[], query: string): FileNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;

  const walk = (list: FileNode[]): FileNode[] => {
    const kept: FileNode[] = [];
    for (const node of list) {
      if (node.name.toLowerCase().includes(needle)) {
        kept.push(node);
        continue;
      }
      if (node.children) {
        const children = walk(node.children);
        if (children.length > 0) kept.push({ ...node, children });
      }
    }
    return kept;
  };

  return walk(nodes);
}

/**
 * Human age of a commit, from a Unix **seconds** timestamp (the unit
 * `CommitSummary.time` uses).
 *
 * `now` is injectable so the output can be asserted; future-dated commits
 * (clock skew between machines is common) read as "just now" rather than
 * "-3 days ago".
 */
export function relativeTime(seconds: number, now: number = Date.now()): string {
  if (!Number.isFinite(seconds)) return 'unknown';

  const deltaMs = now - seconds * 1000;
  if (deltaMs <= 0) return 'just now';

  // Milliseconds, matching `deltaMs`. These were written in seconds first, which
  // made an hour-old commit read as "1 month ago" - the unit tests caught it.
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  if (deltaMs < MINUTE) return 'just now';
  if (deltaMs < HOUR) {
    const mins = Math.floor(deltaMs / MINUTE);
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  }
  if (deltaMs < DAY) {
    const hours = Math.floor(deltaMs / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(deltaMs / DAY);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** Locale date for an ISO timestamp, or the raw string if it will not parse. */
export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString();
}
