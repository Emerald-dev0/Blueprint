export type Permission =
  | 'fs.read'
  | 'fs.write'
  | 'ai.complete'
  | 'ui.panel'
  | 'ui.tab'
  | 'git.read'
  | 'git.write'
  | 'python.execute'
  | 'network.request';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: Permission[];
  minBlueprintVersion: string;
  entrypoints: {
    frontend?: string;
    backend?: string;
    python?: string;
  };
}

export interface WorkspaceAPI {
  openTab: (id: string, type: string, title: string) => void;
  closeTab: (id: string) => void;
  toggleWing: (wing: 'left' | 'right') => void;
}

export interface AIAPI {
  complete: (prompt: string, options?: any) => Promise<string>;
  registerPersona: (persona: any) => void;
}

export interface GitHubAPI {
  listRepos: () => Promise<any[]>;
  createIssue: (title: string, body: string) => Promise<void>;
}

export interface EventBus {
  subscribe: (event: string, callback: (data: any) => void) => void;
  publish: (event: string, data: any) => void;
}

export interface BlueprintAPI {
  workspace: WorkspaceAPI;
  ai: AIAPI;
  github: GitHubAPI;
  events: EventBus;
  registerCommand: (id: string, label: string, handler: () => void) => void;
  registerPanel: (id: string, component: any) => void;
}

export abstract class BlueprintPlugin {
  constructor(protected api: BlueprintAPI) {}
  abstract activate(): void;
  abstract deactivate(): void;
}
