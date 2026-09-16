import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  groupThinkingFramework,
  hasOperatingManual,
  sortManuals,
} from '../../apps/desktop/src/lib/personas';

const PERSONAS_ROOT = fileURLToPath(new URL('../../packages/personas', import.meta.url));

interface PersonaManifest {
  id: string;
  name: string;
  identity: string;
  mission: string;
  version: string;
  capabilities?: string[];
  labels?: string[];
  tools?: string[];
}

const personaDirs = readdirSync(PERSONAS_ROOT)
  .filter((entry) => statSync(path.join(PERSONAS_ROOT, entry)).isDirectory())
  .sort();

function readManifest(dir: string): PersonaManifest {
  return JSON.parse(
    readFileSync(path.join(PERSONAS_ROOT, dir, 'persona.json'), 'utf8')
  ) as PersonaManifest;
}

/**
 * The Rust loader skips any directory without a valid `persona.json`, and it
 * used to do so silently: two shipped personas had none, so the registry came
 * up with fewer agents than the repository appeared to contain. These tests
 * fail at that class of mistake before it reaches a packaged app.
 */
describe('persona registry on disk', () => {
  it('contains personas', () => {
    expect(personaDirs.length).toBeGreaterThanOrEqual(20);
  });

  it.each(personaDirs)('%s has a valid persona.json', (dir) => {
    const manifestPath = path.join(PERSONAS_ROOT, dir, 'persona.json');
    expect(existsSync(manifestPath), `missing ${dir}/persona.json`).toBe(true);

    const manifest = readManifest(dir);
    expect(manifest.id, `${dir}: id must equal the directory name`).toBe(dir);
    expect(manifest.name.trim().length).toBeGreaterThan(0);
    expect(manifest.identity.trim().length).toBeGreaterThan(20);
    expect(manifest.mission.trim().length).toBeGreaterThan(20);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.capabilities?.length ?? 0).toBeGreaterThan(0);
    expect(manifest.labels?.length ?? 0).toBeGreaterThan(0);
  });

  it.each(personaDirs)('%s has unique, non-empty capability and label ids', (dir) => {
    const manifest = readManifest(dir);
    for (const list of [manifest.capabilities ?? [], manifest.labels ?? []]) {
      for (const value of list) {
        expect(value.trim().length, `${dir}: empty entry`).toBeGreaterThan(0);
      }
      expect(new Set(list).size, `${dir}: duplicate entries`).toBe(list.length);
    }
  });

  it('has an operating manual (instructions.md) for nearly every persona', () => {
    const withoutManual = personaDirs.filter(
      (dir) => !existsSync(path.join(PERSONAS_ROOT, dir, 'instructions.md'))
    );
    // Metadata-only personas are allowed but should stay rare: without an
    // instructions.md the compiled prompt is just an identity and a mission.
    expect(withoutManual.length).toBeLessThanOrEqual(2);
  });

  it.each(personaDirs.filter((dir) => existsSync(path.join(PERSONAS_ROOT, dir, 'instructions.md'))))(
    '%s instructions.md follows the house structure',
    (dir) => {
      const content = readFileSync(path.join(PERSONAS_ROOT, dir, 'instructions.md'), 'utf8');
      expect(content.startsWith('# '), `${dir}: must start with a level-1 heading`).toBe(true);
      for (const section of [
        '## IDENTITY',
        '## MISSION',
        '## CORE RESPONSIBILITIES',
        '## DECISION FRAMEWORK',
        '## THINKING PROCESS',
        '## FAILURE MODES',
        '## OUTPUT STANDARDS',
        '## QUALITY CHECKLIST',
      ]) {
        expect(content, `${dir}: missing ${section}`).toContain(section);
      }
      // The loader parses "- [ ] " items into the persona's quality standards.
      expect(content).toMatch(/^- \[ \] /m);
      // ...and "- **Format**:" into the output format.
      expect(content).toMatch(/- \*\*Format\*\*:/);
    }
  );

  it.each(
    personaDirs.filter((dir) =>
      existsSync(path.join(PERSONAS_ROOT, dir, 'thinking-framework.md'))
    )
  )('%s thinking-framework.md uses parseable STEP headings', (dir) => {
    const content = readFileSync(
      path.join(PERSONAS_ROOT, dir, 'thinking-framework.md'),
      'utf8'
    );
    const steps = content.split('\n').filter((line) => line.startsWith('## STEP'));
    expect(steps.length, `${dir}: expected numbered steps`).toBeGreaterThanOrEqual(3);
    // The loader strips "## STEP" and keeps the remainder, so "## STEP 1: X".
    for (const step of steps) {
      expect(step).toMatch(/^## STEP \d+: \S/);
    }
    expect(content).toMatch(/^- /m);
  });
});

describe('groupThinkingFramework', () => {
  it('nests sub-questions under their step', () => {
    const steps = groupThinkingFramework([
      'STEP 1: CONTRACT FIRST',
      '  - What is the output schema?',
      '  - Which fields may be null?',
      'STEP 2: FAILURE ENUMERATION',
      '  - What happens on timeout?',
    ]);

    expect(steps).toHaveLength(2);
    expect(steps[0].title).toBe('1: CONTRACT FIRST');
    expect(steps[0].details).toEqual([
      'What is the output schema?',
      'Which fields may be null?',
    ]);
    expect(steps[1].title).toBe('2: FAILURE ENUMERATION');
    expect(steps[1].details).toEqual(['What happens on timeout?']);
  });

  it('keeps legacy flat entries intact', () => {
    const steps = groupThinkingFramework(['1: PLAN', '2: EXECUTE']);
    expect(steps).toEqual([
      { title: '1: PLAN', details: [] },
      { title: '2: EXECUTE', details: [] },
    ]);
  });

  it('promotes a leading bullet instead of dropping it', () => {
    expect(groupThinkingFramework(['  - Only a bullet'])).toEqual([
      { title: 'Only a bullet', details: [] },
    ]);
  });

  it('tolerates empty input', () => {
    expect(groupThinkingFramework([])).toEqual([]);
    expect(groupThinkingFramework(undefined)).toEqual([]);
    expect(groupThinkingFramework(['   ', ''])).toEqual([]);
  });
});

describe('hasOperatingManual / sortManuals', () => {
  it('detects a missing instructions.md', () => {
    expect(hasOperatingManual({ instructions: '# MANUAL' })).toBe(true);
    expect(hasOperatingManual({ instructions: '   ' })).toBe(false);
    expect(hasOperatingManual({})).toBe(false);
  });

  it('sorts without mutating the input', () => {
    const input = [{ name: 'Zed' }, { name: 'Ada' }];
    const sorted = sortManuals(input);
    expect(sorted.map((m) => m.name)).toEqual(['Ada', 'Zed']);
    expect(input.map((m) => m.name)).toEqual(['Zed', 'Ada']);
  });
});
