'use client';

import * as React from 'react';
import { Task, TaskStatus } from '@blueprint/types';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityIndicator } from '@blueprint/ui';

interface ExecutionTimelineProps {
  tasks: Task[];
  className?: string;
}

export function ExecutionTimeline({ tasks, className }: ExecutionTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution Timeline</h3>
        <span className="text-[10px] font-mono text-[#00FF9D]">{tasks.filter(t => t.status === 'completed').length}/{tasks.length} Tasks</span>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:bg-white/5">
        {tasks.map((task) => (
          <div key={task.id} className="relative flex items-start space-x-4 ml-6">
            <div className="absolute -left-6 mt-1 flex items-center justify-center">
              <StatusIcon status={task.status} />
            </div>

            <div className="flex-grow space-y-1">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "text-xs font-bold uppercase tracking-tight",
                  task.status === 'active' ? "text-[#00FF9D]" : "text-slate-300"
                )}>
                  {task.title}
                </h4>
                <span className="text-[10px] font-mono text-slate-600 lowercase">{task.roleId}</span>
              </div>

              <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                {task.description}
              </p>

              {task.status === 'active' && (
                <div className="pt-2">
                  <ActivityIndicator label="Processing intent..." />
                </div>
              )}

              {task.output && (
                <div className="mt-2 p-3 bg-white/5 rounded border border-white/5 text-[11px] font-mono text-slate-400">
                  {task.output}
                </div>
              )}

              {task.error && (
                <div className="mt-2 p-3 bg-red-500/5 rounded border border-red-500/10 text-[11px] font-mono text-red-400">
                  {task.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={16} className="text-[#00FF9D] bg-[#0B0B0B]" />;
    case 'active':
      return <Circle size={16} className="text-[#00FF9D] animate-pulse bg-[#0B0B0B]" />;
    case 'waiting_approval':
      return <UserCheck size={16} className="text-amber-500 bg-[#0B0B0B]" />;
    case 'failed':
      return <AlertCircle size={16} className="text-red-500 bg-[#0B0B0B]" />;
    default:
      return <Clock size={16} className="text-slate-700 bg-[#0B0B0B]" />;
  }
}
