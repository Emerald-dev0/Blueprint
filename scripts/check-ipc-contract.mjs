#!/usr/bin/env node
/**
 * Verifies the frontend↔backend IPC contract.
 *
 * The audit found six commands the UI invoked that did not exist in the Rust
 * backend at all — get_adrs, search_memory, create_git_commit, push_git_changes,
 * list_github_issues, create_github_pull_request. Every one failed at runtime,
 * and because the call sites caught the failure into console.error and fell
 * back to hardcoded mock data, the UI looked like it worked. Nothing in CI
 * could see it, because CI never built the Rust and never cross-checked the two
 * halves.
 *
 * This script fails the build when:
 *   - the frontend invokes a command that is not registered in generate_handler!
 *   - a #[tauri::command] is defined but never registered (dead command)
 *
 * Run: node scripts/check-ipc-contract.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const FRONTEND_ROOT = 'apps/desktop/src';
const BACKEND_ROOT = 'apps/desktop/src-tauri/src';
const MAIN_RS = join(BACKEND_ROOT, 'main.rs');

/** Commands intentionally defined but not exposed over IPC. */
const ALLOWED_UNREGISTERED = new Set();

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'target' || entry === 'gen') continue;
      walk(full, exts, out);
    } else if (exts.includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

// --- what the frontend calls -------------------------------------------------
const invoked = new Map(); // command -> Set<file>
for (const file of walk(FRONTEND_ROOT, ['.ts', '.tsx'])) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\binvoke\s*(?:<[^>]*>)?\s*\(\s*['"`]([a-z0-9_]+)['"`]/g)) {
    if (!invoked.has(m[1])) invoked.set(m[1], new Set());
    invoked.get(m[1]).add(file);
  }
}

// --- what the backend defines ------------------------------------------------
const defined = new Set();
for (const file of walk(BACKEND_ROOT, ['.rs'])) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/#\[tauri::command\][\s\S]{0,200}?\bfn\s+([a-z0-9_]+)/g)) {
    defined.add(m[1]);
  }
}

// --- what main.rs registers --------------------------------------------------
const mainSrc = readFileSync(MAIN_RS, 'utf8');
const handlerMatch = mainSrc.match(/generate_handler!\s*\[([\s\S]*?)\]/);
if (!handlerMatch) {
  console.error(`✖ Could not find generate_handler![...] in ${MAIN_RS}`);
  process.exit(1);
}
const registered = new Set(
  handlerMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((path) => path.split('::').pop())
);

// --- report ------------------------------------------------------------------
let failed = false;

const missing = [...invoked.keys()].filter((cmd) => !registered.has(cmd)).sort();
if (missing.length) {
  failed = true;
  console.error('\n✖ Frontend invokes commands that are not registered in main.rs:\n');
  for (const cmd of missing) {
    const where = defined.has(cmd)
      ? 'defined in Rust but MISSING from generate_handler!'
      : 'NOT DEFINED anywhere in the backend';
    console.error(`  ${cmd}  (${where})`);
    for (const file of invoked.get(cmd)) console.error(`      called from ${file}`);
  }
}

const orphaned = [...defined]
  .filter((cmd) => !registered.has(cmd) && !ALLOWED_UNREGISTERED.has(cmd))
  .sort();
if (orphaned.length) {
  failed = true;
  console.error('\n✖ #[tauri::command] functions never registered in main.rs:\n');
  for (const cmd of orphaned) console.error(`  ${cmd}`);
  console.error('\n  Register them, or delete them.');
}

if (failed) {
  console.error('\nIPC contract check failed.\n');
  process.exit(1);
}

console.log(
  `✓ IPC contract OK — ${invoked.size} invoked, ${registered.size} registered, ${defined.size} defined`
);
