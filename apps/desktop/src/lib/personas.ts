/**
 * Persona helpers shared by the renderer.
 *
 * The Rust registry hands the renderer a flat `thinking_framework: string[]`
 * that preserves the source document's hierarchy by indentation: step headers
 * (`"STEP 1: CONTRACT FIRST"`) followed by their sub-questions (`"  - What is
 * the exact output schema?"`). Rendering that flat list numbered 1..N turned a
 * five-step framework into twenty unrelated items, so the grouping lives here
 * where it can be unit-tested.
 */

export interface FrameworkStep {
  /** e.g. `1: CONTRACT FIRST` — the `STEP` prefix is dropped for display. */
  title: string;
  /** Sub-questions belonging to the step. */
  details: string[];
}

const STEP_PREFIX = /^step\s*/i;

/**
 * Fold the flat framework entries back into steps with nested details.
 *
 * Entries that are not bullets start a new step; bullets attach to the step
 * above them. A leading bullet (a framework with no step headers) becomes a
 * step of its own so nothing is dropped.
 */
export function groupThinkingFramework(entries: string[] | undefined | null): FrameworkStep[] {
  const steps: FrameworkStep[] = [];

  for (const raw of entries ?? []) {
    if (typeof raw !== 'string') continue;
    const line = raw.trim();
    if (!line) continue;

    const bullet = line.replace(/^[-*•]\s*/, '');
    const isBullet = bullet !== line;
    const title = bullet.replace(STEP_PREFIX, '').trim();

    if (isBullet) {
      if (steps.length > 0) {
        steps[steps.length - 1].details.push(title);
      } else if (title) {
        steps.push({ title, details: [] });
      }
      continue;
    }

    if (title) steps.push({ title, details: [] });
  }

  return steps;
}

/** `true` when the persona shipped an `instructions.md` operating manual. */
export function hasOperatingManual(manual: { instructions?: string }): boolean {
  return Boolean(manual.instructions && manual.instructions.trim().length > 0);
}

/**
 * Stable display order for the persona picker: alphabetical by name, which is
 * already how the Rust command sorts them, but the renderer must not depend on
 * that (a HashMap would otherwise reshuffle on every reload).
 */
export function sortManuals<T extends { name: string }>(manuals: T[]): T[] {
  return [...manuals].sort((a, b) => a.name.localeCompare(b.name));
}
