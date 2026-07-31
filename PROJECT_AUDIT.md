# Blueprint Project Audit

**Audit date:** 2026-07-31 · **Auditor:** engineering review (automated + manual)
**Method:** build verification (`pnpm install/lint/typecheck/test/build`, `cargo check`, `cargo test`), full-stack source review, GitHub state review.

This document is the **honest state of every subsystem**. Do not read it as a wishlist — read it as the truth. Each item is labelled **done / partial / missing / stub** with a priority where relevant.

---

## 1a. Post-Audit Update (2026-07-31)

The `feranmi-edit` branch was audited and **integrated into `develop`** (PR #37) after this audit was written. It fixed a substantial portion of the debt below. Resolved:

- **Rust backend compiles and ships real providers.** Gemini/Anthropic/OpenAI are now real SSE streaming implementations (Anthropic/OpenAI were literal `"<provider> response placeholder"` strings); Ollama + OpenCode added; `ModelRouter` dead-end (`ollama/llama3` with no provider) replaced by a validated user-owned `RoutingConfig`. `Result<_, String>` errors replaced with typed `ProviderError`.
- **IPC is now enforced.** `scripts/check-ipc-contract.mjs` cross-checks every `invoke()` against `generate_handler!` both directions (18 invoked / 36 registered / 36 defined). The 6 missing commands (`get_adrs`, `search_memory`, `create_git_commit`, `push_git_changes`, `list_github_issues`, `create_github_pull_request`) were implemented. The swallow-into-mock-data pattern was removed via `lib/ipc.ts`.
- **Git layer is real** (`git2` for status/branches/commit/summary; push shells out to `git`).
- **Rust CI exists.** `ci.yml` now runs `cargo check --all-targets`, clippy, and `cargo test` (0 → **27 tests**, incl. real TCP-SSE provider transport tests). Branch protection updated to require `Frontend` / `Backend` / `IPC contract` / `audit`.
- **Security fixes:** Gemini key moved from query param to `x-goog-api-key` header; redaction centralized + broadened (8 tests); HTTP timeouts; no `unwrap()` on poisoned mutex; app-data dirs instead of CWD-relative.
- **UI:** 3 token systems collapsed to 1 (148 hardcoded hex literals → token utilities); memory-page false-empty-state fixed; loading/error states; Tailwind actually compiles (PostCSS + `@source`).

**Still open (this audit's remaining debt):** Tauri capabilities file (P0), fake plugin registration, persona/task/plugin consolidation, tool-calling loop, marketplace, dead-code cleanup, no Playwright.

---

## 1. Completed Systems (what actually works)

| System | Evidence |
|---|---|
| Monorepo toolchain | pnpm 11 + Turborepo; lint/typecheck/test/build green on `main` via CI |
| CI + Security workflows | `validate` + `audit` jobs pass; GitGuardian checks pass |
| Tauri v2 desktop shell | Renderer (Next.js 15 static export) + Rust core build and run; 21 IPC commands registered |
| Rust core wiring | `cargo check` passes (13 warnings); `cargo test` passes (0 tests) |
| Keyring secret storage | Rust `keyring` crate for provider/GitHub tokens |
| Redaction engine | Regex-based scrubbing of AWS/Stripe/API keys/private keys before provider calls |
| Gemini provider | Real REST implementation via `generateContent` |
| SQLite memory manager | `projects`/`adrs`/`memory_entries`/`user_preferences` tables; `get_adrs` + `search_memory` work |
| Repo scanner (extension-based) | Walks tree with `ignore` crate, detects stack by extensions/names |
| Web intelligence | Fetches URL, extracts title/H1, naive tech detection |
| GitHub REST client | `set_github_credential`, `list_github_repositories` work |
| Design system | 14 UI components (button, input, textarea, dialog, popover, tabs, etc.) on Ink & Mint tokens |
| Workspace framework (renderer) | Tabs, resizable wings, command palette, persisted zustand state |
| Persona registry (partial) | Loads `persona.json` + thinking-framework for 15 of 18 persona dirs |
| Git workflow | Branch protection on `main`+`develop`, Conventional Commits enforced by Husky/commitlint |

## 2. Partially Implemented Systems

- **AOS kernel** (`ai/aos/*`): persona registry + workflow engine exist, but `tools.rs` has 1 real + 1 mock tool, `eval.rs` hardcodes a 0.85 score, `workflow.rs` is a hardcoded 2-task graph, and `compile_prompt` assembles prompts from near-empty manual fields.
- **Orchestration engine** (`ai/orchestration/*`): role registry is hardcoded (11 roles) and duplicates the AOS persona system; `tools.rs` is an empty `ToolRegistry` placeholder.
- **Project intelligence**: scanner works but is **not Tree-sitter based** (the Cargo dependency is unused); no code embeddings; `analyze_website` is naive.
- **GitHub intelligence**: 4 of 10 SDK commands are unregistered dead calls; `get_git_status`/`create_git_branch`/`suggest_git_commit_message`/`generate_github_release_notes`/`get_git_state_summary` are stubs returning mocks.
- **Plugin suite**: 4 plugins have minimal `src/index.ts` activations (register one command, subscribe to events, emit console logs / mock reports); 5 plugins are `manifest.json` scaffolds only; no plugin loads at runtime.

## 3. Missing Functionality (documented but absent)

- **Vector memory (LanceDB)** — documented everywhere; no code. Memory is SQL LIKE search.
- **Tree-sitter indexing** — Cargo dep present, never used.
- **Ollama / local models** — `ModelRouter` routes `offline/private` to `("ollama","llama3")`, but no Ollama provider exists → guaranteed failure.
- **Anthropic + OpenAI providers** — return `"<Provider> response placeholder"`.
- **Tauri v2 capabilities file** — no `capabilities/` dir; `@tauri-apps/plugin-shell` and core event listen may be denied at runtime. **P0.**
- **E2E tests (Playwright)** — none configured.
- **Python tools** — `run_python_tool` spawns `python` but no reusable tools are declared anywhere; no Python scripts exist in the repo.
- **Blueprint CLI** — `scripts/blueprint-cli.ts` requires `ts-node`, which is not a dependency.
- **Marketplace** — frontend store is mock data; marketplace page/PRs not wired.
- **App data paths** — SQLite DB + plugin dir opened relative to CWD; breaks packaged app. **P0.**
- **Supported-models metadata** — README documents `supported-models.json` per persona; the files do not exist.

## 4. Technical Debt (ranked)

| # | Debt | Severity |
|---|---|---|
| 1 | No Tauri capabilities file — shell/open + event listen unpermissioned | **P0** |
| 2 | CWD-relative data/plugin paths (production-unusable) | **P0** |
| 3 | Persona/AOS data: 3 missing files, empty fields, ids disagree across `roles.rs`, `packages/personas`, TS types (`reference-analyst` vs `reference_specialist`, `"pm"`/`"architect"` hardcoded in workflow.rs) | P1 |
| 4 | Provider placeholders (anthropic/openai) + dead Ollama route | P1 |
| 5 | 4 unregistered IPC commands (git-engine) | P1 |
| 6 | Type mismatch: `ai/page.tsx` expects `Persona{id,name,identity,version,thinkingFramework}` but Rust returns `AgentRole` — persona sidebar never renders | P1 |
| 7 | Duplicated systems: 3 task/TaskGraph definitions (orchestration, aos, types); 3 plugin "systems" (SDK types, Rust manager, frontend fake); 2 personas sources; 2 memory stories | P1 |
| 8 | Fake plugin registration in `application-shell.tsx` (`io.blueprint.react-intel`) referencing a nonexistent `index.js` | P1 |
| 9 | Duplicate design-token files (`styles.css` == `tokens.css` == tokens in `globals.css`) | P2 |
| 10 | Empty/stub packages shipped: `@blueprint/brain`, `@blueprint/core`, `apps/docs`, `tests/integration` | P2 |
| 11 | Rust warnings (13) + unused deps: `git2`, `tree-sitter`, `walkdir`, `tokio`, `futures-util`, `env_logger`, `log` | P2 |
| 12 | `next lint` (deprecated in Next 15) used in `apps/desktop` | P2 |
| 13 | ESLint relaxed: `no-explicit-any` off, unused vars = warn; Rust exempt from lint | P2 |
| 14 | Zero Rust tests, one placeholder Vitest test (`true === true`) | P2 |
| 15 | `packages/personas` not a package but under `packages/*` glob; `plugins/*` includes non-packages | P2 |
| 16 | CI does not build/test the Rust crate (only audits it) | P2 |

## 5. Architectural Risks

- **IPC surface is untyped at the boundary.** Frontend `invoke()` calls are strings; command signatures drift silently (proven by the 4 dead calls and the `get_personas` type mismatch). Recommendation: single source-of-truth command schema + generated clients.
- **Provider abstraction is thin and partially fake.** Two of four providers are placeholders; the router can select a nonexistent provider. A wrong choice yields a confusing runtime error rather than a graceful "not available".
- **Three competing definitions of a task/persona/plugin** mean any feature built today picks a winner arbitrarily. Consolidation is a prerequisite for the next features.
- **Plugin "system" is decorative.** No runtime loads `plugins/*`; manifests are read from a directory that doesn't exist (`<cwd>/plugins`). The permission model (`permissions` in manifest) is declared but never enforced.
- **Memory is SQL-only** while the roadmap promises semantic search. Feature claims in `ROADMAP.md`/docs exceed shipped capability.

## 6. Scalability Concerns

- `search_memory` = `LIKE '%term%'`; degrades on large entry sets; no embeddings.
- Repo scanner is a single-pass walk; no incremental/background indexing, no persistence of scan results, no progress events to the UI.
- SQLite file + plugin scans use CWD paths — no per-project isolation or multi-project layout yet.
- Zustand workspace state is renderer-only; there is no Rust-side workspace/session store, so multi-window or restore-across-launch is limited.

## 7. Security Concerns

- **P0: capabilities missing** (shell open, events, dialog, etc. not declared).
- Python execution has no allowlist/sandbox — `run_python_tool` spawns `python` with whatever args the (untrusted) renderer sends.
- No input validation on several commands (e.g. `set_ai_credential` provider id free-string).
- `get_git_state_summary` returns hardcoded mock data — must never echo real secrets (it doesn't today, but stubs should be removed or honest).
- Redaction is regex-based; coverage is partial (fine as baseline, not a guarantee).
- No dependency auditing of the Rust crate in CI beyond `cargo audit` on a cron — cargo lockfile churn is not gated on PRs.

## 8. Performance Concerns

- Desktop renderer ships ~103 kB first-load JS per page + Next runtime for a local tool; fine, but no code-splitting budget tracked.
- Rust compile warnings + unused deps slow builds; `git2` + `tree-sitter` in the tree bloat binary for nothing.
- No instrumentation/profiling anywhere; no way to measure IPC latency.
- No memoization/`React.memo` strategy documented for large lists (command palette, memory search).

## 9. Developer Experience Concerns

- **No `CONTRIBUTING.md`-documented way to run the desktop app end-to-end** in dev (Tauri + Next dev); `pnpm dev` runs turbo dev but the Tauri shell boot isn't documented.
- `packages/personas` and `plugins/*` shapes are inconsistent (some have `package.json`, most don't) — confusing for contributors.
- Zero Rust tests and no `cargo test`/`cargo clippy` in CI means the core can rot silently.
- The placeholder `tests/unit/base.test.ts` gives false confidence in "tests pass".
- Docs overclaim (LanceDB, Tree-sitter, Ollama, Wasm sandbox) — every doc page that names an unimplemented system misleads contributors. Priority to fix: `docs/architecture/DATA_ARCHITECTURE_AND_MEMORY_SYSTEM.md`, `PROJECT_INTELLIGENCE_ENGINE.md`, `AI_INTELLIGENCE_ARCHITECTURE.md`, `README.md`, `ROADMAP.md`.

## 10. GitHub State Audit

- Branches: `main` + `develop` only (feature branches cleaned). Protection enforced on both (PR required, 1 approval, required checks `validate`+`audit`, no force-push/delete).
- PRs: 35 merged, 0 open. Issues: 17 closed, 0 open. Tags: none.
- Commit discipline: Conventional Commits + commitlint; merge history is clean (feature→develop→main).
- **Gap:** no `release/*` branch has ever been cut; no version tags; CHANGELOG has no released versions yet.

## 11. What "Green CI" Actually Proves

- `validate`: lint (warnings tolerated), typecheck, **1 test**, static build. It does **not** compile or test the Rust crate.
- `audit`: npm + cargo advisory scans.
- Therefore: **"CI is green" ≠ "the desktop app works."** The Rust crate compiles (verified locally) but is unexercised in CI; provider placeholders, missing capabilities, and dead IPC calls would all pass CI today.

## 12. Verdict

Blueprint is a **well-formed foundation with real bones** (monorepo, Tauri split, keyring, redaction, SQLite memory, Gemini provider, design system, CI/discipline) and a **large amount of documented intent that is not yet real** (vectors, Tree-sitter, providers, plugins, personas completeness, marketplace). It is not production-ready. The priority order is: **capabilities + data paths (P0) → consolidate personas/tasks/plugins → finish or remove stubs → real tests → CI coverage of Rust → docs accuracy**.
