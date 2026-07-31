# Feranmi Edit — Audit & Repair Log

Branch: `feranmi-edit` (based on `develop`)

This document records a professional audit of Blueprint and the repairs made
during it. It is written for whoever picks this up next, including future me.

---

## TL;DR

Three things were true at the start of this audit, none of them visible from
the outside:

1. **The Rust backend had never compiled.** `cargo check` failed with 6 errors.
   The desktop binary could not be produced at all, so no Tauri command in
   Blueprint had ever executed.
2. **The app shipped with zero Tailwind utilities.** One missing PostCSS config
   meant every class name in the entire application was a no-op.
3. **CI was green through all of it.** It ran lint/typecheck/test on TypeScript
   only, never invoked `cargo`, and `next build` exits 0 whether or not the CSS
   pipeline ran.

The architecture existed. The UI code existed. Almost none of it ran.

Current state: everything builds, 27 backend tests pass, and `Blueprint.app`
launches.

---

## Verification

```
IPC contract    18 invoked, 36 registered, 36 defined
TS typecheck    8/8 packages
cargo check     clean
cargo test      27/27
next build      12/12 routes
tauri build     Blueprint.app
```

Reproduce:

```bash
pnpm install
pnpm check:ipc
pnpm typecheck
cd apps/desktop/src-tauri && cargo check --all-targets && cargo test
cd apps/desktop && pnpm build
```

---

## 1. Build and render

### Tailwind was never compiling

`globals.css` used Tailwind v4 syntax (`@import "tailwindcss"`) but there was
no PostCSS config anywhere in the repo. Next resolved the import as plain CSS
and emitted only the theme variable block — the 26KB stylesheet was ~24KB of
font declarations. `rounded` appeared **0 times**. `grid` appeared **0 times**.

Fixed by adding `@tailwindcss/postcss` and `apps/desktop/postcss.config.mjs`,
plus an `@source` directive so Tailwind scans `packages/ui/src` (workspace
packages sit outside the app directory and are not auto-detected).

### The Rust backend did not compile

| Error | Cause |
|---|---|
| `get_personas` | referenced `orchestration::roles::Persona` and a `.personas` field. The type is `AgentRole`; the field is `.roles`. |
| `assemble_team` | registered in `generate_handler!` but **never defined**. This is what made the macro fail to expand and took the whole crate down. |
| `events.rs` | called `window.emit` with `tauri::Manager` imported. `emit` moved to the `Emitter` trait in Tauri v2. |
| `generate_context!` | `src-tauri/icons/` did not exist. |

Icons were generated from the Ink & Mint identity (PNG ladder, `.ico`, `.icns`).

### Other build-level defects

- **Nav rail rendered nothing.** `NavItem` returned `props.children` when
  `asChild` was set, and every call site passes a childless `<Link>`. Six empty
  boxes. Fixed by injecting the icon into the slotted element.
- **No `tsconfig.json` in leaf packages**, so each package's `tsc` inherited the
  root config, compiled the whole monorepo, and lacked the app's `@/*` aliases.
  `pnpm typecheck` failed repo-wide.
- **8 package entry files were UTF-16LE**, including `packages/types/src/index.ts`.
  PowerShell redirect artifacts.
- `tsconfig.tsbuildinfo` was committed (137KB of machine-specific state).

---

## 2. Provider layer

### The trait blocked the product vision

```rust
// before
async fn complete(&self, api_key: &str, ...) -> Result<CompletionResponse, String>;
```

That signature asserts at the type level that every intelligence provider is a
hosted HTTP service behind a bearer token. A local OpenCode install or an Ollama
daemon has no API key, so "bring your own provider" was **not expressible**,
regardless of what else was added.

Auth is now provider-declared:

```rust
pub enum AuthKind {
    ApiKey { signup_url: &'static str },
    LocalEndpoint { default_endpoint: &'static str },
}
```

### Streaming is now the primitive

`stream()` is the trait method; `complete()` is derived from it by buffering.
The previous ordering could not be reversed later without touching every call
site, the orchestrator, and the timeline UI. An agent that runs for minutes with
no visible output and no stop button is not a usable developer tool.

### Anthropic and OpenAI were placeholders

Both literally returned `"<provider> response placeholder"`. Only Gemini was
implemented. Both are now real SSE streaming implementations, alongside Gemini
(`streamGenerateContent?alt=sse`), Ollama, and OpenCode.

### Typed errors

`Result<_, String>` is gone. `ProviderError` distinguishes auth failure from
rate limit from an unreachable local daemon, so the UI can choose between
"Retry" and "Fix settings" rather than showing one generic message. Error
strings never echo response bodies — a provider error body can contain the
prompt that was just sent.

---

## 3. Routing

`ModelRouter::route` was a hardcoded `match` returning compile-time vendor
constants. It could not express "use Claude as my provider" or "use my local
OpenCode" — the two interactions the product exists for. It also routed
`Offline`/`Private` to `("ollama", "llama3")` while **no Ollama provider was
ever registered**, making that branch a guaranteed runtime failure.

Worse: `run_aos_completion` always requested `Reasoning`, which the match pinned
to Anthropic — which was a stub. **The primary AOS path could never return a
real completion.**

Replaced with a user-owned `RoutingConfig` on `AIManager`, validated on write,
surfaced as a **Routing** tab in Settings mapping each capability to a provider
and model.

---

## 4. Commands the UI invoked that did not exist

Six of them. Five were absent from the backend entirely; `search_memory` existed
as a `MemoryManager` method with no `#[tauri::command]` wrapper.

| Command | Was | Now |
|---|---|---|
| `get_adrs` | did not exist | implemented |
| `search_memory` | method, unwrapped | implemented |
| `create_git_commit` | did not exist | implemented (git2) |
| `push_git_changes` | did not exist | implemented |
| `list_github_issues` | did not exist | implemented |
| `create_github_pull_request` | did not exist | implemented |

Every call site caught the failure into `console.error` and fell through to
hardcoded mock data. **That is why the app looked like it worked.**

### The git layer was fake

`git2` was a declared dependency and entirely unused.

- `get_git_status` returned `"Clean workspace (Mock)"`
- `create_git_branch` only `println!`-ed
- `get_git_state_summary` returned a hardcoded `{"branch": "develop", "status": "clean"}`,
  so **every persona reasoned about a fictional repository**

All now use `git2`. `push_git_changes` deliberately shells out to `git` so it
works with the user's existing credential helper, SSH agent, and 2FA setup.

---

## 5. Security

| Issue | Resolution |
|---|---|
| Gemini API key sent as `?key=` query param — leaks into proxy logs, crash reports, any surface echoing the URL | moved to `x-goog-api-key` header |
| `run_aos_completion` never called `RedactionEngine`, so the path that injects git state, file contents, and memory shipped **unredacted** project context | redaction centralised in `redact_outbound`, applied on every path |
| Redaction missed GitHub, OpenAI, Anthropic, Google, Slack tokens, JWTs, `Authorization:` headers, credentialed connection strings — i.e. the token types Blueprint itself stores | patterns broadened, 8 tests |
| No HTTP timeout anywhere; a hung provider hung Blueprint | shared client with connect/read timeouts |
| `.unwrap()` on mutex locks — one poisoned lock panics the app | recover the guard instead |
| `personas_root` was `"../../packages/personas"` relative to process CWD; SQLite landed wherever the app was launched from. In a packaged `.app` the persona registry would load nothing and every AOS call would fail | resolved via Tauri resource / app-data dirs |

---

## 6. Design system

Three parallel token systems existed:

1. `packages/ui/src/styles/tokens.css` — a full `--bp-*` scale, **imported by
   nothing**
2. the `@theme` block in `globals.css` — live, barely used
3. **148 hardcoded hex literals in TSX** — what actually rendered. `#00FF9D`
   alone appeared 94 times

Renaming the brand colour meant editing 94 call sites.

Consolidated into one `@theme` block, extended with `surface-1/2/3` and
`edge`/`edge-strong` (the elevation and hairline values that were being spelled
inline). All 148 literals rewritten to token utilities. Both dead CSS files
deleted. Rendering verified unchanged.

---

## 7. UI states

The Memory page rendered **"NO DECISIONS RECORDED" directly above a fake ADR
card** — both branches gated on `adrs.length === 0`.

Also fixed there and elsewhere:

- `isSearching` was set and never rendered — no loading state existed anywhere
- errors swallowed into `console.error` with no UI state
- a "Vector Search Ready" badge over what is a SQL `LIKE '%q%'` scan; there are
  no embeddings anywhere in the codebase
- `import { Clock }` on the **last line of the file**, after all code
- a tab whose "empty state" was three decorative cards that read as real data

New `apps/desktop/src/lib/ipc.ts` wraps every Tauri call, detects whether the
runtime is present, and throws a typed `IpcError`. The swallow-into-mock-data
pattern is gone.

---

## 8. Guardrails

### `scripts/check-ipc-contract.mjs`

Cross-checks every `invoke('...')` in the frontend against `generate_handler!`
in `main.rs`, in both directions — missing commands and orphaned commands.
Verified it fails on the original bug by re-introducing it.

```bash
pnpm check:ipc
```

### CI

Was: lint, typecheck, test — TypeScript only.

Now three jobs:

- **frontend** — lint, typecheck, test, build
- **backend** — `cargo check --all-targets`, clippy, `cargo test`
- **ipc-contract** — the parity check above

### Tests: 0 → 27

The repo's only test was `expect(true).toBe(true)`. There were no Rust tests.

The provider tests stand up **real TCP listeners serving canned SSE** and drive
the actual provider implementations against them, so framing, delta extraction,
the `[DONE]` sentinel, and `Retry-After` parsing are genuinely exercised rather
than mocked. No network, no new dependencies.

Coverage: Anthropic delta assembly, OpenAI-compatible framing (shared by
OpenCode and Ollama), Gemini candidate extraction, typed error mapping
(401/429/503/unreachable/missing-credential), routing validation, provider
auth-kind invariants, and redaction.

---

## Not done

**No tool-calling loop.** The dead-code warnings mark it precisely:
`aos::tools::ToolRuntime`, `aos::eval::EvaluationEngine`, and
`orchestration::tasks::{Task, TaskGraph}` compile but nothing references them.
The trait streams text, so personas can describe work but cannot perform it.
This is the next real capability and the honest remaining distance to the
product described in the vision docs.

**No live provider call verified.** No API keys were available, so the transport
was proven against local servers, not against Anthropic/OpenAI/Google. The wire
formats follow current documentation but the first real request is unproven.

**Repo hygiene**
- `main` carries an orphan commit (`c5cd8ef`, plugin marketplace) that was pushed
  directly, bypassing the `feature → develop → main` workflow. It is not on
  `develop` and will be lost unless cherry-picked.
- GitHub's default branch is still `feature/design-system`, so a fresh clone
  lands on a stale 4-commit branch.

---

## Commits

```
c190722  test: cover the provider transport and routing (27 tests, was 0)
7ab45c3  ci: build the Rust backend and enforce the IPC contract
b6985ff  feat(ui): wire Settings to the real provider API; stop swallowing IPC errors
959591c  refactor(ui): collapse three token systems into one
7ab9a06  feat(ai): make the backend compile and providers actually interchangeable
9db8c98  chore: stop tracking *.tsbuildinfo build artifacts
7eb703e  fix(audit): repair build config, nav rail, encodings, and security defects
b188efd  fix(ui): restore Tailwind compilation via @tailwindcss/postcss
```

---

## The lesson worth keeping

None of these were subtle bugs. They were invisible because **nothing ran the
code**. `next build` exits 0 with a broken CSS pipeline. CI never touched Rust.
Frontend errors fell back to mock data that looked like success.

A green pipeline that does not execute the thing it is testing is worse than no
pipeline, because it manufactures confidence. The three guardrails added here —
build the backend, run the tests, check the IPC contract — exist so this class
of failure cannot recur silently.
