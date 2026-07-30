import { BlueprintPlugin, BlueprintAPI } from '@blueprint/plugin-sdk';

export default class WorkflowPackPlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('workflow.start-new-product', 'Workflow: Start New Product', () => {
      this.api.workspace.openTab('new-product-flow', 'ai', 'New Product Workflow');
    });

    console.log('✓ AI Workflow Pack Activated');
  }

  deactivate() {
    console.log('AI Workflow Pack Deactivated');
  }
}
