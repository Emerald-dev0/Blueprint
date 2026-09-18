import { BlueprintPlugin, type BlueprintAPI } from '@blueprint/plugin-sdk';

/**
 * Inert scaffolding: no host instantiates this class, because Blueprint has no
 * plugin runtime yet (see the SDK header).
 *
 * This plugin used to hard-code a target URL (linear.app), log an orchestration
 * it never performed ("Reference Analyst -> UX Designer -> Frontend Engineer")
 * and note that "in a real system this would be async". The real decomposition
 * is the `plan_aos_workflow` command behind Agent OS -> Workflow Planner, which
 * returns an actual task graph rather than narrating one.
 */
export default class WorkflowPackPlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('workflow.plan', 'Workflow: Plan This Goal', () => {
      this.api.events.publish('WORKFLOW_PLAN_REQUESTED', {});
    });
  }

  deactivate() {}
}
