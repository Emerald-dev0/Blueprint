// Blueprint Shared Types

export type AIProviderId = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderId;
  contextWindow: number;
  capabilities: {
    reasoning: boolean;
    tools: boolean;
    vision: boolean;
    streaming: boolean;
  };
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface AIChatOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
}

export interface AICompletionResponse {
  content: string;
  modelId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIError {
  code: string;
  message: string;
  provider: AIProviderId;
}

export interface AIProviderConfig {
  id: AIProviderId;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  defaultModelId?: string;
}

// --- Orchestration & Persona Types ---
//
// This section used to declare `AgentRoleId` (a 13-value union of ids such as
// 'architect', 'frontend' and 'pm'), a `Persona` interface keyed by it, and a
// `Task` / `TaskGraph` / `TaskStatus` trio with lowercase statuses. None of it
// described the product: personas are authored on disk under
// `packages/personas/<id>/persona.json` (24 of them, discovered at runtime by
// the Rust registry), and the planner in `ai/aos/workflow.rs` emits those
// directory ids together with serde's capitalized status variants ('Pending',
// 'Active', 'Completed', 'Failed').
//
// A union that lists ids which never existed - and omits every id that does -
// is worse than no type at all, because it type-checks against fiction. The
// live models are `OperatingManual` and `WorkflowTask` / `TaskGraph` in
// `apps/desktop/src/lib/ipc.ts`, which mirror what the core actually
// serializes. They are deliberately not duplicated here: a second copy is how
// the drift happened in the first place.


// --- Project Intelligence Types ---

export interface TechStack {
  language: string[];
  frontend?: string[];
  backend?: string[];
  database?: string[];
  infrastructure?: string[];
}

export interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, any>;
  spacing: string[];
}

export interface ProjectIntelligence {
  id: string;
  intent: string;
  stack: TechStack;
  design?: DesignTokens;
  architectureMap?: any;
  risks: string[];
}

// --- Memory Types ---

export type MemoryTier = 'session' | 'project' | 'decision' | 'knowledge' | 'user' | 'agent';

export interface MemoryEntry {
  id: number;
  tier: MemoryTier;
  key: string;
  content: string;
  metadata?: string;
  created_at: string;
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

// --- GitHub Ecosystem Types ---

/**
 * GitHub entities in the camelCase shape the renderer uses.
 *
 * Only `GitHubRepository` is produced today, by `list_github_repositories`
 * through the mapping in `@blueprint/git-engine`. `GitHubIssue` and
 * `GitHubPullRequest` describe what the core will return once issue and
 * pull-request commands exist; nothing produces them yet, so no UI may render
 * them (see the roadmap in the README).
 */
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  language: string | null;
  stars: number;
  updatedAt: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  branch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
}
