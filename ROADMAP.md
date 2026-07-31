# Blueprint Roadmap

Mission: an **AI Engineering Operating System** — Blueprint owns orchestration, personas, workflows, memory, tools, and project intelligence; the AI model is a swappable provider.

> **Reality check (2026-07-31):** The foundation is real and **now builds end-to-end**: monorepo, Tauri split, keyring, redaction, SQLite memory, **five real providers** (Gemini/Anthropic/OpenAI/Ollama/OpenCode) with streaming, real git2 operations, a **typed IPC contract enforced in CI**, Rust CI (27 tests), and a single design-token source. Everything below is **not yet done**. Items land as scoped PRs through the workflow in `AGENTS.md`.

## Phase 0 — Stabilize the shell (P0 debt)

- [x] CI: Rust backend built, clippy'd, tested; IPC contract checked (Frontend/Backend/IPC contract/audit).
- [x] App-data paths for SQLite + personas (Tauri resource/app-data dirs).
- [ ] Tauri v2 **capabilities file**: declare only what the app needs (shell open, core events); remove reliance on implicit permissions. **P0.**
- [ ] Remove the fake plugin registration (`io.blueprint.react-intel`) in `application-shell.tsx`.
- [ ] Remove the `true === true` placeholder Vitest test once real renderer tests exist.

## Phase 1 — Consolidate the core (one source of truth)

- [x] **Providers**: real implementations + routing (user-owned `RoutingConfig`). Graceful "provider unavailable" errors via typed `ProviderError`.
- [x] **IPC honest**: `check-ipc-contract` + all 36 commands wired.
- [ ] **Personas**: single persona schema + registry. Fix missing files (`frontend-engineer`, `backend-engineer` `persona.json`, `ux-designer` instructions), load `instructions.md` into the operating manual, populate empty fields, reconcile ids (`roles.rs` / `packages/personas` / TS types / `workflow.rs`).
- [ ] **Tasks**: one `Task`/`TaskGraph` type (Rust + TS), used by both orchestration and AOS workflow engine (currently dead code duplicated in two places).
- [ ] **Tool-calling loop**: wire `ToolRuntime`/`EvaluationEngine` into the AOS so personas can perform work, not just describe it (currently dead code — the honest remaining distance to the product vision).
- [ ] **Plugins**: one plugin system. Runtime host that loads `plugins/*` from the configured directory, enforces declared `permissions`, and wires `BlueprintAPI` (workspace, ai, github, events) — replacing the types-only SDK, the unloaded Rust manager, and the frontend fake.

## Phase 2 — Memory & intelligence (real semantic layer)

- [ ] Vector memory (LanceDB or SQLite-vec) with embeddings; semantic `search_memory`; tiered memory (`MemoryTier`).
- [ ] Tree-sitter-based indexing (dependency already present) with incremental scans, persisted results, and progress events.
- [ ] `packages/brain` + `packages/core` become real packages or are removed.

## Phase 3 — GitHub & automation

- [ ] Live provider calls verified against real APIs (transport proven via local servers; wire formats per docs, first live request unproven).
- [ ] PR/issue automation surface exercised end-to-end (`list_github_issues`, `create_github_pull_request`).

## Phase 4 — Plugin suite & marketplace

- [ ] Official plugins ship manifest + activation + **tests**; no scaffold-only plugins.
- [ ] Python tools as reusable, permission-gated tools through the plugin bridge.
- [ ] Marketplace: real registry (fetch + install), wired to the plugin runtime.

## Phase 5 — Product quality

- [ ] Playwright E2E covering core flows (shell, memory, settings, AI page).
- [ ] UI states: loading/empty/error everywhere; audit every page (several still mock/placeholder).
- [ ] Branding pass: blueprint-architecture logo direction; premium polish per `AGENTS.md` §9.
- [ ] Remove dead code + unused Rust deps (`tree-sitter`, `walkdir`, `tokio`, `futures-util`, `env_logger`, `log`).

## Phase 6 — Release

- [ ] First `release/0.1.0` branch, version tag, desktop bundles, CHANGELOG for 0.1.0.
- [ ] Multi-project + enterprise organization memory (post-0.1).

---
*Scope is deliberately smaller than earlier docs. When a phase says "implement X", X becomes a set of issues + PRs, not one big change.*
