import { BlueprintPlugin, BlueprintAPI } from '@blueprint/plugin-sdk';
import { Globe } from 'lucide-react';

export default class WebIntelligencePlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('web.analyze-url', 'Intelligence: Analyze URL', () => {
      this.api.workspace.openTab('web-analyzer', 'intelligence', 'Web Analyzer');
    });

    // In a real implementation, we'd register a component here
    // this.api.registerPanel('web-details', WebDetailsPanel);

    console.log('✓ Website Intelligence Plugin Activated');
  }

  deactivate() {
    console.log('Website Intelligence Plugin Deactivated');
  }
}
