# Blueprint Production Readiness Checklist

This document defines the quality gates required for Blueprint to transition
from alpha to professional engineering use.

**Honesty rule:** a box is checked only when the capability is implemented and
exercised by CI or a manual test note. Unchecked means "not done", not "not
important". The 2026-09-15 revision unchecked every box that had no
implementation behind it; the previous version of this file claimed, among other
things, verified keychain support on all platforms, audit logging, sub-2s cold
start, <300MB RSS and "provider independence verified with Gemini, Claude and
OpenAI" at a time when two of the three providers returned hard-coded placeholder
strings.

## 🛡 Security Gates

- [x] **Local Redaction:** Outgoing AI prompts are scanned on every provider path
      for AWS/Stripe/GitHub/OpenAI/Anthropic/Slack/Google tokens, JWTs, bearer
      headers, connection strings and PEM blocks. Covered by Rust unit tests.
- [x] **CSP Enforcement:** WebView is locked to `'self'` plus the Tauri IPC
      origins; `unsafe-eval` removed; AI provider origins are *not* reachable
      from the renderer.
- [x] **Secret Storage:** Keys go to the OS credential store (Windows Credential
      Manager / macOS Keychain / freedesktop Secret Service) with actionable
      errors when no provider is running.
- [ ] **Sandboxed Plugins:** No plugin execution runtime exists yet. The
      unsandboxed Python escape hatch was removed rather than shipped.
- [x] **Audit Logging:** Security-critical events (credential writes, project
      opens, branch creation, AI calls with redaction counts) append to
      `audit.jsonl` in the per-user log directory.

## 🚀 Performance Gates

- [ ] **Cold Start:** Not measured on packaged builds. Measure before claiming.
- [ ] **Memory Footprint:** Not measured. Measure before claiming.
- [x] **Non-blocking indexing:** The repository scan runs on a blocking task off
      the async runtime (`spawn_blocking`), so the window stays responsive.
- [ ] **Indexing Scalability:** Not tested against 100k+ file repositories.

## 🧠 Intelligence Gates

- [x] **Provider Independence:** Gemini, Anthropic, OpenAI and local Ollama
      adapters all call their real APIs; a missing key produces an actionable
      error instead of a placeholder.
- [x] **Intent Continuity:** Workspace layout persists across restarts via the
      zustand persist middleware; the project brain persists to SQLite.
- [ ] **RAG Accuracy:** Semantic retrieval is not implemented (search is SQL
      `LIKE`). LanceDB vector indexing remains roadmap work. The "Vector Search
      Ready" badge was removed from the UI.

## 🌳 Engineering Gates

- [x] **CI Integrity:** `ci.yml` runs lint, typecheck, unit tests, renderer
      export, rustfmt, clippy (`-D warnings`) and `cargo test`. `desktop.yml`
      builds real installers on Windows, Linux and macOS.
- [x] **Test Coverage:** Rust unit tests cover redaction patterns and the
      repository scanner; Vitest covers route/path normalization. Coverage is
      small but every test asserts real behaviour.
- [x] **Monorepo Discipline:** Empty placeholder packages were left in place but
      are no longer advertised; the renderer consumes `@blueprint/ui` and a typed
      IPC layer instead of ad-hoc `invoke` strings.

## 🖥 Platform Gates (added 2026-09-15)

- [x] **Windows:** NSIS + MSI bundling configured and built in CI; WebView2
      install mode and IPC-safe CSP set; per-user install mode.
- [x] **Linux:** deb / rpm / AppImage bundling configured and built in CI from an
      Ubuntu 22.04 baseline for glibc compatibility; Secret Service requirement
      documented.
- [x] **macOS:** app / dmg bundling built in CI to prevent regressions on the
      third platform.
- [ ] **Code signing / notarization:** Not configured for any platform.
      Installers are currently unsigned.

---
*Blueprint v0.1.0-alpha. Status: packaging real, intelligence partial, honesty
enforced.*
