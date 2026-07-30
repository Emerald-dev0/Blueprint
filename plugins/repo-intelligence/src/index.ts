import { BlueprintPlugin, BlueprintAPI } from '@blueprint/plugin-sdk';

export default class RepoIntelligencePlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('repo.analyze', 'Intelligence: Analyze Repository', () => {
      this.api.workspace.openTab('repo-analyzer', 'intelligence', 'Repository Analyzer');
    });

    this.api.events.subscribe('PROJECT_OPENED', (data) => {
      console.log('Repo Intelligence reacting to Project Opened:', data);
      // Auto-trigger a shallow scan
    });

    console.log('✓ Repository Intelligence Plugin Activated');
  }

  deactivate() {
    console.log('Repository Intelligence Plugin Deactivated');
  }
}
