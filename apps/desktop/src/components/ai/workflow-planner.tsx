'use client';

import * as React from 'react';
import { ActivityIndicator, Badge, Button, Textarea } from '@blueprint/ui';
import { GitBranch, Workflow } from 'lucide-react';
import { api, type TaskGraph } from '@/lib/ipc';
import { ExecutionTimeline } from './execution-timeline';

/**
 * Surfaces the Rust planner (`plan_aos_workflow`).
 *
 * The command existed in the core but nothing called it, and the tab that should
 * have hosted it said "not yet implemented".
 *
 * Be precise about what it does, because the UI must not oversell it:
 * `ai/aos/workflow.rs` returns a **fixed three-step scaffold** - requirements
 * analysis (`product-manager`), architecture and data models
 * (`software-architect`), production-readiness review (`principal-engineer`) -
 * with the user's goal interpolated into the first task only. It does not
 * analyse the goal, match persona labels, or vary the number of tasks. Planning
 * is local and makes no provider call, so it needs no API key.
 */
interface WorkflowPlannerProps {
  /** Persona id -> display name, from the manuals already loaded by the page. */
  personaNames: Record<string, string>;
}

/** Goals to try. The plan shape is fixed, so these differ only in task one. */
const EXAMPLES = [
  'Design and build a rate limiter for the public API',
  'Audit the desktop app for accessibility problems',
  'Write the release notes and migration guide for v0.2',
];

export function WorkflowPlanner({ personaNames }: WorkflowPlannerProps) {
  const [goal, setGoal] = React.useState('');
  const [graph, setGraph] = React.useState<TaskGraph | null>(null);
  const [isPlanning, setIsPlanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const plan = React.useCallback(async () => {
    const trimmed = goal.trim();
    if (!trimmed || isPlanning) return;

    setIsPlanning(true);
    setError(null);
    try {
      setGraph(await api.planAosWorkflow(trimmed));
    } catch (e) {
      setGraph(null);
      setError(String(e));
    } finally {
      setIsPlanning(false);
    }
  }, [goal, isPlanning]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void plan();
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <label
          htmlFor="planner-goal"
          className="block text-[10px] font-black uppercase tracking-widest text-slate-500"
        >
          Engineering goal
        </label>
        <Textarea
          id="planner-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="What should the team accomplish?"
          className="resize-none border-white/5 bg-[#141414] font-mono text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={plan}
            disabled={isPlanning || goal.trim().length === 0}
          >
            {isPlanning ? <ActivityIndicator label="Planning" /> : <Workflow size={14} className="mr-2" />}
            Plan the work
          </Button>
          <span className="font-mono text-[10px] text-slate-600">
            Local decomposition · no provider call · ⌘/Ctrl + Enter
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setGoal(example)}
              className="rounded-full border border-white/5 bg-white/5 px-3 py-1 font-mono text-[10px] text-slate-500 transition-colors hover:border-[#00FF9D]/30 hover:text-slate-300"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      {isPlanning && !graph && (
        <div className="py-12">
          <ActivityIndicator label="Routing tasks to personas..." />
        </div>
      )}

      {graph && !isPlanning && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <GitBranch size={14} className="text-[#00FF9D]" />
            <h3 className="truncate text-xs font-bold uppercase tracking-tight text-white">
              {graph.goal}
            </h3>
            <Badge variant="outline" className="border-white/10 text-[9px] text-slate-400">
              {graph.status}
            </Badge>
            <Badge variant="outline" className="border-white/10 text-[9px] text-slate-400">
              {graph.tasks.length} tasks
            </Badge>
          </div>

          {graph.tasks.length === 0 ? (
            <p className="font-mono text-xs text-slate-500">
              The planner produced no tasks for this goal.
            </p>
          ) : (
            <ExecutionTimeline tasks={graph.tasks} personaNames={personaNames} />
          )}

          <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-slate-600">
            This is a plan, not a running execution: nothing advances a task on its own, so
            every task stays queued. The shape is a fixed three-step scaffold today -
            requirements, architecture, review - and only the first task quotes your goal.
            To carry one out, open the AI Teammate page, pick that persona and give it the
            task as the goal; execution calls a provider and needs an API key in Settings.
          </p>
        </section>
      )}

      {!graph && !isPlanning && !error && (
        <div className="space-y-3 rounded-3xl border border-dashed border-white/5 p-12 text-center">
          <Workflow size={36} className="mx-auto text-slate-800" />
          <p className="font-mono text-sm text-slate-500">No plan yet</p>
          <p className="mx-auto max-w-md font-mono text-xs text-slate-600">
            Describe a goal and Blueprint returns its three-step plan for it - requirements,
            architecture, review - with each step naming the persona that should carry it out.
          </p>
        </div>
      )}
    </div>
  );
}
