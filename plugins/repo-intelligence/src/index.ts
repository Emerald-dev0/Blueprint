import { BlueprintPlugin, type BlueprintAPI } from '@blueprint/plugin-sdk';

/**
 * Inert scaffolding: no host instantiates this class, because Blueprint has no
 * plugin runtime yet (see the SDK header).
 *
 * It registers one palette command and publishes the intent on the event bus.
 * The repository scan it stands in for already exists in the app as the
 * `start_repo_analysis` command behind the Intelligence page - a plugin would
 * call that, not reimplement it.
 */
export default class RepoIntelligencePlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('repo.scan', 'Intelligence: Scan Repository', () => {
      this.api.events.publish('REPO_SCAN_REQUESTED', {});
    });
  }

  deactivate() {}
}
