import { BlueprintPlugin, type BlueprintAPI } from '@blueprint/plugin-sdk';

/**
 * Inert scaffolding: no host instantiates this class, because Blueprint has no
 * plugin runtime yet (see the SDK header).
 *
 * This plugin used to publish an `ANALYSIS_COMPLETED` event carrying a
 * hard-coded report ("Reference Design", two invented colour tokens) with the
 * comment "Mock result for now". Publishing fabricated analysis is worse than
 * publishing nothing, so it is gone. The real website analysis lives in the app
 * as the `analyze_website` command behind the Intelligence page.
 */
export default class WebIntelligencePlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('web.analyze-url', 'Intelligence: Analyze URL', () => {
      this.api.events.publish('WEB_ANALYSIS_REQUESTED', {});
    });
  }

  deactivate() {}
}
