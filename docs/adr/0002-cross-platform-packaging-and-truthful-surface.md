# 0002 — Cross-platform packaging and a truthful product surface

- **Status:** Accepted
- **Date:** 2026-09-15
- **Supersedes:** nothing; complements [0001](0001-choice-of-tauri-v2.md)

## Context

Blueprint targets Windows, Linux and macOS as a Tauri v2 desktop app, but the
packaging configuration had never been executed on any platform, and a review of
the codebase found that the shipped surface repeatedly described capabilities
with no implementation behind them. Two classes of problem had to be solved
together: making the app actually install and run per-OS, and making every claim
the UI makes correspond to something real.

## Decisions

### 1. Hermetic renderer build (self-hosted fonts)

`next/font/google` fetched font CSS and binaries from `fonts.googleapis.com`
_during_ `next build`. The build therefore failed on any machine without egress
(airgapped CI, offline `tauri build`) and made a local-first product depend on a
third-party network service. We vendor the same faces through
`@fontsource-variable/*` npm packages, so the export is reproducible offline.
The type scale is declared once in `globals.css` `@theme` so `font-sans` /
`font-mono` utilities and the CSS variables cannot diverge (previously the
utility won the cascade and Inter never rendered).

### 2. Directory-style static export (`trailingSlash: true`)

Tauri serves `frontendDist` as a static directory; extension-less `.html`
resolution is inconsistent between the WebView2 (Windows) and WebKitGTK (Linux)
backends. Directory output (`ai/index.html`) resolves identically everywhere.
Consequence: `usePathname()` reports trailing slashes, so all route comparisons
go through `normalizePath()` and the shared `ROUTES` table.

### 3. All application paths resolve from Tauri base directories

The database, plugin directory and persona registry were derived from the
process working directory (`"blueprint.db"`, `"."`, `"../../packages/personas"`),
which is undefined for an app launched from a Start Menu shortcut, `.desktop`
file or dock icon. `src/paths.rs` now resolves them from
`app_data_dir` / `app_log_dir` / bundled resources, with
`BLUEPRINT_PERSONAS_DIR` as a development override.

### 4. Tauri v2 ACL declared explicitly

`src-tauri/capabilities/desktop.json` grants `core:default` plus the dialog
plugin to the `main` window only. Without any capability file, `core:event`
(`listen()`) and other core APIs are denied and fail silently. The renderer is
deliberately granted **no** filesystem or shell permission: privileged work
stays in the Rust main process, which is the security property the architecture
documents promise.

### 5. Strict CSP, IPC-safe on Windows

`connect-src` now includes both `ipc:` (Linux/macOS custom protocol) and
`http://ipc.localhost` (WebView2), `script-src` drops `'unsafe-eval'`, and the
AI provider origins were removed from `connect-src` entirely — the renderer
makes no provider calls (Rust does), so allowing them only widened the XSS blast
radius.

### 6. Removed the unsandboxed Python runner

`run_python_tool` spawned `python <arbitrary path from the renderer>` with no
sandbox, permission check or path validation, directly contradicting the stated
security model, and nothing called it. Removed. A sandboxed execution runtime is
the Wasm plugin work already tracked in the roadmap.

### 7. Removed advertised-but-absent capabilities from the dependency graph

`tree-sitter`, `walkdir` and `futures-util` were declared and never used; the
README nonetheless advertised "deep semantic analysis using Tree-sitter". The
dependencies are removed and the claim is withdrawn until real parsing lands.
The repository scanner remains (extension/manifest based) and now reports a file
count as evidence of what it examined.

### 8. Real providers, real git, measured security counters

- Anthropic and OpenAI providers previously returned hard-coded placeholder
  strings and ignored the API key; they now call the live APIs. A local Ollama
  provider was added so the router's `Offline`/`Private` branch (and the
  "code never leaves your machine" promise) is real.
- Redaction now covers every message of every role on every path (the Agent OS
  path previously sent unredacted system prompts) and reports a count; the UI's
  redaction badge and the audit log are driven by that count instead of
  constants.
- All git commands are implemented with `git2` against the open project; the
  previous hard-coded "branch develop / clean" summary is gone.
- An append-only local audit log (`audit.jsonl`) provides the trail the
  production checklist claimed existed.

### 9. CI must build what we ship

`ci.yml` gains a `rust` job (rustfmt, clippy `-D warnings`, `cargo test`) and
`desktop.yml` builds real bundles on `ubuntu-22.04` (deb/rpm/AppImage),
`windows-latest` (NSIS/MSI) and `macos-latest` (app/dmg). Ubuntu 22.04 is pinned
because AppImage glibc compatibility requires building on the oldest supported
baseline. Previously CI ran only `pnpm` steps, so the Rust side was never
compiled.

### 10. Documentation states what is true

`PRODUCTION_READY.md`, `ROADMAP.md` and the README are rewritten to check only
what is implemented. The "Final Engineering Review" document is relabelled as a
synthetic self-review rather than an external panel.

## Consequences

- Builds are reproducible offline; fonts ship in the bundle (~2 MB).
- Packaged installs keep data in per-user directories; no stray files in the
  launch directory.
- Linux users need a Secret Service provider for key storage; the error message
  says so explicitly.
- Claims in UI and docs now carry an implementation burden: anything advertised
  must exist, and counters must be measurements.
