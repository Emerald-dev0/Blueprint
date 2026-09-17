'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityIndicator } from '@blueprint/ui';
import type { TaskStatus, WorkflowTask } from '@/lib/ipc';

/**
 * Renders a task graph produced by the Rust planner (`plan_aos_workflow`).
 *
 * The component used to take `Task[]` from `@blueprint/types`, whose statuses
 * were lowercase ('completed', 'waiting_approval') while the core serializes
 * serde unit variants ('Completed', 'Active', ...). Every status comparison
 * therefore failed, and the field it rendered (`title`, `description`) does not
 * exist on the real payload - which has `goal`. Nothing caught this because
 * nothing rendered the component. It is wired to the planner in
 * `/ai/aos` → Workflow Planner, against the real types.
 */
interface ExecutionTimelineProps {
  tasks: WorkflowTask[];
  /** Persona id -> display name, from the loaded operating manuals. */
  personaNames?: Record<string, string>;
  className?: string;
}

const STATUS_COPY: Record<TaskStatus, string> = {
  Pending: 'queued',
  Active: 'running',
  Completed: 'done',
  Failed: 'failed',
};

export function ExecutionTimeline({ tasks, personaNames, className }: ExecutionTimelineProps) {
  const completed = tasks.filter((task) => task.status === 'Completed').length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Execution Timeline
        </h3>
        <span className="font-mono text-[10px] text-[#00FF9D]">
          {completed}/{tasks.length} tasks complete
        </span>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:bg-white/5">
        {tasks.map((task) => {
          const persona = personaNames?.[task.role_id] ?? task.role_id;
          return (
            <div key={task.id} className="relative ml-6 flex items-start space-x-4">
              <div className="absolute -left-6 mt-1 flex items-center justify-center">
                <StatusIcon status={task.status} />
              </div>

              <div className="flex-grow space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <h4
                    className={cn(
                      'text-xs font-bold uppercase tracking-tight',
                      task.status === 'Active' ? 'text-[#00FF9D]' : 'text-slate-300'
                    )}
                  >
                    {task.goal}
                  </h4>
                  <span className="shrink-0 font-mono text-[10px] lowercase text-slate-600">
                    {persona}
                  </span>
                </div>

                <p className="font-mono text-[10px] text-slate-600">
                  {task.id} · {STATUS_COPY[task.status]}
                  {task.dependencies.length > 0 && ` · after ${task.dependencies.join(', ')}`}
                </p>

                {task.status === 'Active' && (
                  <div className="pt-2">
                    <ActivityIndicator label="Working through this task..." />
                  </div>
                )}

                {task.output && (
                  <div className="mt-2 rounded border border-white/5 bg-white/5 p-3 font-mono text-[11px] text-slate-400">
                    {task.output}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'Completed':
      return <CheckCircle2 size={16} className="bg-[#0B0B0B] text-[#00FF9D]" />;
    case 'Active':
      return <Circle size={16} className="animate-pulse bg-[#0B0B0B] text-[#00FF9D]" />;
    case 'Failed':
      return <AlertCircle size={16} className="bg-[#0B0B0B] text-red-500" />;
    case 'Pending':
    default:
      return <Clock size={16} className="bg-[#0B0B0B] text-slate-700" />;
  }
}
