/**
 * Typed wrappers around the Tauri command surface.
 *
 * Command names and payload shapes were previously re-declared as string
 * literals and `any` casts at every call site, which let drift go unnoticed
 * (for example `generate_ai_completion` returning an object while callers
 * still expected a string). Everything the renderer can ask the Rust core to
 * do is declared here once, with the exact serde field names the Rust side
 * serializes (snake_case, as declared).
 */

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export interface CompletionResult {
  content: string;
  model_id: string;
  provider_id: string;
  secrets_redacted: number;
}

export interface TechStack {
  languages: string[];
  frontend: string[];
  backend: string[];
  database: string[];
}

export interface RepoReport {
  stack: TechStack;
  path: string;
  files_scanned: number;
}

export interface FileStatus {
  path: string;
  state: string;
}

export interface GitStatusReport {
  repository_root: string;
  branch: string;
  is_clean: boolean;
  ahead: number;
  behind: number;
  files: FileStatus[];
  recent_commits: { id: string; summary: string; author: string; time: number }[];
}

export interface OperatingManual {
  id: string;
  name: string;
  identity: string;
  mission: string;
  expertise: string[];
  responsibilities: string[];
  /** Step headers and their indented sub-questions, verbatim from
   *  `thinking-framework.md` (`"STEP 1: X"` then `"  - question"`). */
  thinking_framework: string[];
  tools: string[];
  output_format: string;
  quality_standards: string[];
  version: string;
  /** Routing tags from `persona.json`. */
  labels: string[];
  /** The full `instructions.md` manual, empty if the persona ships none. */
  instructions: string;
}

export interface MemoryEntry {
  id: number | null;
  tier: 'session' | 'project' | 'decision' | 'knowledge' | 'user' | 'agent';
  key: string;
  content: string;
  metadata: string | null;
  created_at: string | null;
}

export interface ADR {
  id: number;
  title: string;
  status: string;
  context: string;
  decision: string;
  consequences: string;
  created_at: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  minBlueprintVersion: string | null;
}

/** Serde unit-variant names, exactly as Rust serializes them. */
export type TaskStatus = 'Pending' | 'Active' | 'Completed' | 'Failed';

export interface WorkflowTask {
  id: string;
  /** A persona id from `packages/personas` (e.g. `software-architect`). */
  role_id: string;
  goal: string;
  status: TaskStatus;
  dependencies: string[];
  output: string | null;
}

export interface TaskGraph {
  id: string;
  goal: string;
  tasks: WorkflowTask[];
  status: string;
}

export interface ExportedFile {
  path: string;
  bytes: number;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

/** Result of writing AGENTS.md / CLAUDE.md / GEMINI.md into the open project. */
export interface AgentContextExport {
  project_path: string;
  written: ExportedFile[];
  skipped: SkippedFile[];
  personas: number;
  adrs: number;
  memories: number;
  files_scanned: number;
  secrets_redacted: number;
}

export const api = {
  generateCompletion(
    providerId: string,
    modelId: string,
    messages: { role: string; content: string }[]
  ): Promise<CompletionResult> {
    return invoke('generate_ai_completion', { providerId, modelId, messages });
  },

  getOperatingManuals(): Promise<OperatingManual[]> {
    return invoke('get_operating_manuals');
  },

  reloadPersonas(): Promise<void> {
    return invoke('reload_personas');
  },

  /**
   * Run a goal through a persona: the Rust core compiles that persona's
   * operating manual, thinking framework and quality standards into the system
   * prompt, injects git/project context, redacts secrets and routes the call to
   * a provider. `roleId` must be a persona directory id (see
   * `getOperatingManuals`).
   */
  runAosCompletion(
    roleId: string,
    goal: string,
    context: Record<string, unknown> = {}
  ): Promise<CompletionResult> {
    return invoke('run_aos_completion', { roleId, goal, context });
  },

  /** Heuristic decomposition of a goal into persona-assigned tasks. */
  planAosWorkflow(goal: string): Promise<TaskGraph> {
    return invoke('plan_aos_workflow', { goal });
  },

  /**
   * Write AGENTS.md (full context) plus CLAUDE.md and GEMINI.md (import
   * pointers) into the open project so OpenCode, Codex CLI, Gemini CLI and
   * Claude Code all start from Blueprint's understanding of the repository.
   * Existing files that Blueprint did not generate are preserved and reported
   * in `skipped`.
   */
  exportAgentContext(): Promise<AgentContextExport> {
    return invoke('export_agent_context');
  },

  setProjectPath(path: string): Promise<void> {
    return invoke('set_project_path', { path });
  },

  getProjectPath(): Promise<string | null> {
    return invoke('get_project_path');
  },

  analyzeRepo(path?: string): Promise<RepoReport> {
    return invoke('start_repo_analysis', { path: path ?? null });
  },

  getGitStatus(): Promise<GitStatusReport> {
    return invoke('get_git_status');
  },

  getAdrs(): Promise<ADR[]> {
    return invoke('get_adrs', { projectId: 'default' });
  },

  createAdr(input: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
  }): Promise<number> {
    return invoke('create_adr', { projectId: 'default', ...input });
  },

  searchMemory(query: string): Promise<MemoryEntry[]> {
    return invoke('search_memory', { projectId: 'default', query });
  },

  saveMemoryEntry(input: { key: string; content: string }): Promise<number> {
    return invoke('save_memory_entry', {
      projectId: 'default',
      tier: 'knowledge',
      ...input,
    });
  },

  listInstalledPlugins(): Promise<PluginManifest[]> {
    return invoke('list_installed_plugins');
  },

  setAiCredential(providerId: string, key: string): Promise<void> {
    return invoke('set_ai_credential', { providerId, key });
  },
};

/**
 * Ask the OS for a directory and register it as the open project.
 * Returns the chosen path, or null if the user cancelled.
 */
export async function pickProjectDirectory(): Promise<string | null> {
  const chosen = await open({
    directory: true,
    multiple: false,
    title: 'Choose the repository to open',
  });
  // `multiple: false` narrows this to `string | null`, but the generic resolves
  // to a union that includes `string[]`; narrow defensively.
  if (typeof chosen !== 'string') return null;
  await api.setProjectPath(chosen);
  return chosen;
}
