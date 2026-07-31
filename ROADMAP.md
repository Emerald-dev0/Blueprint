# Blueprint Roadmap

Mission: an **AI Engineering Operating System** — Blueprint owns orchestration, personas, workflows, memory, tools, and project intelligence; the AI model is a swappable provider.

> **Reality check (2026-07-31):** The foundation is real (monorepo, Tauri split, keyring, redaction, SQLite memory, Gemini provider, design system, CI + branch protection). Everything below is **not yet done**. Priorities come from `PROJECT_AUDIT.md`. Items are phases, not dates — each lands as scoped PRs through the workflow in `AGENTS.md`.

## Phase 0 — Stabilize the shell (P0 debt)

- [ ] Tauri v2 **capabilities file**: declare only what the app needs (shell open, core events, dialog); remove reliance on implicit permissions.
- [ ] App-data paths: move SQLite DB + plugin dir to the OS app-data directory (Tauri `app_data_dir`), never CWD.
- [ ] Remove the fake plugin registration (`io.blueprint.react-intel`) in `application-shell.tsx`.
- [ ] CI: add `cargo check` + `cargo test` (+ `cargo clippy` when clean) to `validate`; add Rust linting.
- [ ] Replace the `true === true` placeholder test with real tests for at least the memory + redaction subsystems.

## Phase 1 — Consolidate the core (one source of truth)

- [ ] **Personas**: single persona schema + registry. Fix missing files (`frontend-engineer`, `backend-engineer` `persona.json`, `ux-designer` instructions), load `instructions.md`, populate empty fields, reconcile ids (`roles.rs` / `packages/personas` / TS types / `workflow.rs`).
- [ ] **Tasks**: one `Task`/`TaskGraph` type (Rust + TS), used by both orchestration and AOS workflow engine.
- [ ] **Plugins**: one plugin system. Runtime host that loads `plugins/*` from the configured directory, enforces declared `permissions`, and wires `BlueprintAPI` (workspace, ai, github, events) — replacing the three parallel "systems".
- [ ] **Providers**: implement Anthropic + OpenAI; make Ollama real or remove the router route; graceful "provider unavailable" errors.

## Phase 2 — Make the IPC honest

- [ ] Typed command boundary: single command schema; generated TS client + Rust registration, so dead/mismatched calls fail at compile time.
- [ ] Fix or remove the 4 unregistered git-engine calls; implement or remove the git/memory stubs (`get_git_status`, `create_git_branch`, `suggest_git_commit_message`, `generate_github_release_notes`).
- [ ] Fix `get_personas` return contract so the persona sidebar renders (`ai/page.tsx`).

## Phase 3 — Memory & intelligence (real semantic layer)

- [ ] Vector memory (LanceDB or SQLite-vec) with embeddings; semantic `search_memory`; tiered memory (`MemoryTier`).
- [ ] Tree-sitter-based indexing (dependency already present) with incremental scans, persisted results, and progress events.
- [ ] `packages/brain` + `packages/core` become real packages or are removed.

## Phase 4 — GitHub & automation

- [ ] Real `git` operations via `git2` (status, branches, commits, push) instead of mocks.
- [ ] PR/issue automation surface (`list_github_issues`, `create_github_pull_request`) implemented and tested.

## Phase 5 — Plugin suite & marketplace

- [ ] Official plugins ship manifest + activation + **tests**; no scaffold-only plugins.
- [ ] Python tools as reusable, permission-gated tools through the plugin bridge.
- [ ] Marketplace: real registry (fetch + install), wired to the plugin runtime.

## Phase 6 — Product quality

- [ ] Playwright E2E covering core flows (shell, memory, settings, AI page).
- [ ] UI states: loading/empty/error everywhere; single source of design tokens (dedupe 3 copies).
- [ ] Branding pass: blueprint-architecture logo direction (see audit §8); premium polish per `AGENTS.md` §9.

## Phase 7 — Release

- [ ] First `release/0.1.0` branch, version tag, signed/unsigned desktop bundles, CHANGELOG for 0.1.0.
- [ ] Multi-project + enterprise organization memory (post-0.1).

---
*The above is deliberately smaller in scope than earlier docs. Scope not listed here is not promised. When a phase says "implement X", X becomes a set of issues + PRs, not one big change.*
