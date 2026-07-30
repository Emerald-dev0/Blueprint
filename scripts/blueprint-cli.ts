/**
 * Blueprint Plugin CLI Foundation
 * Usage: pnpm ts-node scripts/blueprint-cli.ts init my-plugin
 */

import * as fs from 'fs';
import * as path from 'path';

const command = process.argv[2];
const name = process.argv[3];

if (command === 'init' && name) {
  const pluginDir = path.join(process.cwd(), 'plugins', name);
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }

  const manifest = {
    id: `io.blueprint.${name}`,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    version: '0.1.0',
    author: 'Unknown',
    description: 'A new Blueprint plugin.',
    permissions: ['fs.read'] as string[],
    minBlueprintVersion: '0.1.0',
    entrypoints: {
      frontend: 'index.js'
    }
  };

  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`✓ Plugin ${name} initialized in ${pluginDir}`);
} else {
  console.log('Usage: blueprint-cli init <name>');
}
