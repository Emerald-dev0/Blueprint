export type Permission =
  | 'fs.read'
  | 'fs.write'
  | 'ai.complete'
  | 'ui.panel'
  | 'git.read';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: Permission[];
}

export interface BlueprintAPI {
  registerCommand: (id: string, label: string, handler: () => void) => void;
  registerPanel: (id: string, component: any) => void;
  onEvent: (event: string, callback: (data: any) => void) => void;
}

export abstract class BlueprintPlugin {
  constructor(protected api: BlueprintAPI) {}
  abstract activate(): void;
  abstract deactivate(): void;
}
