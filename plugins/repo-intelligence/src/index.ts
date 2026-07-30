import { BlueprintPlugin, BlueprintAPI } from '@blueprint/plugin-sdk';

export default class RepoIntelligencePlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('repo.scan', 'Intelligence: Scan Repository', () => {
      this.api.workspace.openTab('repo-scanner', 'intelligence', 'Repository Scanner');
    });

    this.api.events.subscribe('PROJECT_OPENED', async (data: { path: string }) => {
      console.log('Repo Intelligence: Auto-scanning repository...');
      this.api.events.publish('ANALYSIS_PROGRESS', { status: 'indexing-files', path: data.path });
    });

    console.log('✓ Repository Intelligence Plugin Activated');
  }

  deactivate() {
    console.log('Repository Intelligence Plugin Deactivated');
  }
}
