'use client';

import * as React from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Search,
  Plus,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input } from '@blueprint/ui';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const mockFiles: FileNode[] = [
  {
    id: '1',
    name: 'apps',
    type: 'folder',
    children: [
      { id: '2', name: 'desktop', type: 'folder', children: [
        { id: '3', name: 'src', type: 'folder' },
        { id: '4', name: 'package.json', type: 'file' }
      ]}
    ]
  },
  {
    id: '5',
    name: 'packages',
    type: 'folder',
    children: [
      { id: '6', name: 'ui', type: 'folder' },
      { id: '7', name: 'core', type: 'folder' }
    ]
  },
  { id: '8', name: 'README.md', type: 'file' },
];

export function ProjectExplorer() {
  const [filter, setFilter] = React.useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Explorer</h3>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-6 w-6"><Plus size={14}/></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical size={14}/></Button>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files..."
            className="h-8 pl-8 text-xs bg-white/5 border-none focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-2">
        {mockFiles.map(node => (
          <FileRow key={node.id} node={node} level={0} />
        ))}
      </div>
    </div>
  );
}

function FileRow({ node, level }: { node: FileNode, level: number }) {
  const [isOpen, setIsOpen] = React.useState(level === 0);
  const Icon = node.type === 'folder' ? Folder : File;

  return (
    <div>
      <div
        className={cn(
          "flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/5 transition-colors group",
          isOpen && node.type === 'folder' && "text-white"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {node.type === 'folder' ? (
          isOpen ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />
        ) : <div className="w-[14px]" />}

        <Icon size={14} className={cn(
          node.type === 'folder' ? "text-[#00FF9D]/60" : "text-slate-500",
          "group-hover:text-[#00FF9D]"
        )} />

        <span className="text-xs font-mono text-slate-400 group-hover:text-white truncate">
          {node.name}
        </span>
      </div>

      {isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FileRow key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
