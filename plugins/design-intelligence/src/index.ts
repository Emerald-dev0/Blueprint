import { BlueprintPlugin, type BlueprintAPI } from '@blueprint/plugin-sdk';

/**
 * Inert scaffolding: no host instantiates this class, because Blueprint has no
 * plugin runtime yet (see the SDK header).
 *
 * The command handler used to be a `console.log` announcing that tokens were
 * being extracted. It now publishes the intent instead, which is the only thing
 * a plugin can really do until a runtime hands it the AI surface.
 */
export default class DesignIntelligencePlugin extends BlueprintPlugin {
  constructor(api: BlueprintAPI) {
    super(api);
  }

  activate() {
    this.api.registerCommand('design.extract-tokens', 'Design: Extract Tokens', () => {
      this.api.events.publish('DESIGN_TOKENS_REQUESTED', {});
    });
  }

  deactivate() {}
}
