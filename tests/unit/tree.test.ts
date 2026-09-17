import { describe, expect, it } from 'vitest';
import { countNodes, filterTree, formatDate, relativeTime } from '../../apps/desktop/src/lib/tree';
import type { FileNode } from '../../apps/desktop/src/lib/ipc';

/**
 * The explorer renders whatever `list_project_files` returns, so the counting,
 * filtering and timestamp logic here is what decides whether the panel tells the
 * truth about a repository.
 */

function dir(name: string, children: FileNode[] = [], path = name): FileNode {
  return { name, path, kind: 'directory', children };
}

function file(name: string, path = name): FileNode {
  return { name, path, kind: 'file' };
}

describe('countNodes', () => {
  it('reports an empty tree as zero of everything', () => {
    expect(countNodes([])).toEqual({ files: 0, directories: 0, depth: 0 });
  });

  it('counts files and directories across levels', () => {
    const tree = [
      dir('apps', [dir('desktop', [file('package.json', 'apps/desktop/package.json')], 'apps/desktop')]),
      dir('packages', [file('README.md', 'packages/README.md')]),
      file('pnpm-workspace.yaml'),
    ];

    expect(countNodes(tree)).toEqual({ files: 3, directories: 3, depth: 3 });
  });

  it('treats a flat tree as depth 1', () => {
    expect(countNodes([file('a'), file('b')]).depth).toBe(1);
  });

  it('counts a directory at the depth cap, whose children were never walked', () => {
    // `children` is absent below the cap, and that must not be mistaken for a
    // file.
    const capped: FileNode = { name: 'deep', path: 'a/b/deep', kind: 'directory' };
    expect(countNodes([dir('a', [dir('b', [capped], 'a/b')], 'a')])).toEqual({
      files: 0,
      directories: 3,
      depth: 3,
    });
  });
});

describe('filterTree', () => {
  const tree = [
    dir('apps', [dir('desktop', [file('page.tsx', 'apps/desktop/page.tsx')], 'apps/desktop')]),
    dir('packages', [file('tree.ts', 'packages/tree.ts')]),
    file('README.md'),
  ];

  it('returns the tree untouched for an empty or whitespace query', () => {
    expect(filterTree(tree, '')).toBe(tree);
    expect(filterTree(tree, '   ')).toBe(tree);
  });

  it('keeps a node whose own name matches, together with its whole subtree', () => {
    const result = filterTree(tree, 'desktop');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('apps');
    expect(result[0].children?.[0].children).toHaveLength(1);
  });

  it('keeps the ancestors of a deep match', () => {
    const result = filterTree(tree, 'page.tsx');
    expect(result.map((n) => n.name)).toEqual(['apps']);
    expect(result[0].children?.[0].name).toBe('desktop');
  });

  it('matches case-insensitively', () => {
    expect(filterTree(tree, 'README').map((n) => n.name)).toEqual(['README.md']);
    expect(filterTree(tree, 'readme').map((n) => n.name)).toEqual(['README.md']);
  });

  it('drops branches with no match at all', () => {
    const result = filterTree(tree, 'tree.ts');
    expect(result.map((n) => n.name)).toEqual(['packages']);
  });

  it('returns nothing when no name contains the query', () => {
    expect(filterTree(tree, 'zzz-not-present')).toEqual([]);
  });
});

describe('relativeTime', () => {
  // 2026-09-17T12:00:00Z in Unix seconds.
  const now = Date.UTC(2026, 8, 17, 12, 0, 0) ;
  const nowSeconds = now / 1000;

  it('reads a timestamp a minute old as one minute', () => {
    expect(relativeTime(nowSeconds - 90, now)).toBe('1 minute ago');
    expect(relativeTime(nowSeconds - 300, now)).toBe('5 minutes ago');
  });

  it('handles hours, days, months and years', () => {
    expect(relativeTime(nowSeconds - 2 * 3600, now)).toBe('2 hours ago');
    expect(relativeTime(nowSeconds - 3 * 86400, now)).toBe('3 days ago');
    expect(relativeTime(nowSeconds - 45 * 86400, now)).toBe('1 month ago');
    expect(relativeTime(nowSeconds - 400 * 86400, now)).toBe('1 year ago');
  });

  it('treats a commit from the future as just now, not negative', () => {
    // Clock skew between the committing machine and this one is common; a
    // negative age would be nonsense in the UI.
    expect(relativeTime(nowSeconds + 3600, now)).toBe('just now');
    expect(relativeTime(nowSeconds, now)).toBe('just now');
  });

  it('pluralises correctly at the boundary', () => {
    expect(relativeTime(nowSeconds - 3600, now)).toBe('1 hour ago');
    expect(relativeTime(nowSeconds - 86400, now)).toBe('1 day ago');
  });

  it('does not crash on a non-numeric timestamp', () => {
    expect(relativeTime(Number.NaN, now)).toBe('unknown');
  });
});

describe('formatDate', () => {
  it('formats a real ISO timestamp', () => {
    expect(formatDate('2026-09-17T10:00:00Z')).not.toBe('2026-09-17T10:00:00Z');
  });

  it('returns the input unchanged when it will not parse', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
