# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Agent interoperability export** (`export_agent_context`, ADR 0003): writes
  `AGENTS.md` into the open project plus `CLAUDE.md` / `GEMINI.md` import
  pointers plus `knowledge.md` for Freebuff/Codebuff (which resolve that name
  before `AGENTS.md`), so OpenCode, Freebuff, Codebuff, Codex CLI, Claude Code,
  Gemini CLI, Amp, Cursor and Zed inherit Blueprint's repository scan, recorded
  decisions, sealed knowledge and persona standards. The export lists only commands actually
  declared in the repository (`package.json` scripts with the detected package
  manager, `make` targets) and states Always / Ask-first / Never boundaries.
  Files Blueprint did not generate are never overwritten, content is redacted
  before it is written, and every export is audited.
- Six new personas — `data-engineer`, `machine-learning-engineer`,
  `mobile-engineer`, `site-reliability-engineer`, `platform-engineer`,
  `engineering-manager` — bringing the registry to 24, each with `persona.json`,
  a full operating manual and a thinking framework.
- `thinking-framework.md` for the 15 personas that had none, and the three
  missing sections (failure modes, output standards, quality checklist) for the
  16 baseline manuals, so every persona compiles into the same prompt structure.
- `instructions.md` for `ux-designer`, previously the only metadata-only persona.
- Persona picker on the AI Teammate page: conversations now run through
  `run_aos_completion`, so the selected persona's operating manual is compiled
  into the system prompt. The page previously called the raw completion command
  with a hard-coded Gemini model and used no persona at all.
- Conversation history (`conversation_history`) and the open project root are
  rendered into the compiled prompt, so persona conversations have memory.
- `apps/desktop/src/lib/personas.ts` (framework grouping, operating-manual
  detection, stable sorting) and `tests/unit/personas.test.ts`: 104 new cases
  validating every persona directory on disk — manifest fields, `id` matching the
  directory name, house sections, quality checklist and `## STEP` headings.
- Credential-aware model routing fallback: when the routed provider has no stored
  key, the call goes to a provider that has one, and the substitution is logged,
  audited and returned to the UI.

- Cross-platform desktop packaging: NSIS/MSI (Windows), deb/rpm/AppImage
  (Linux), app/dmg (macOS), with per-OS bundle metadata, categories, license and
  WebView2 install handling (ADR 0002).
- `src-tauri/capabilities/desktop.json` declaring the Tauri v2 ACL for the main
  window; the renderer is granted no filesystem or shell permission.
- Self-hosted variable fonts (`@fontsource-variable`) so `next build` is
  hermetic and reproducible offline.
- Per-user path resolution (`src/paths.rs`): database, plugin dir and bundled
  persona resources replace working-directory-relative paths that broke every
  packaged install.
- Native directory picker (`@tauri-apps/plugin-dialog`) wired to a real
  project context, repository scanner and git status.
- Local Ollama provider for fully offline analysis; real Anthropic and OpenAI
  API clients (previously hard-coded placeholder strings).
- Append-only local audit log (`audit.jsonl`) for security-relevant events.
- Real `git2`-backed git commands: status with ahead/behind, branch creation with
  name validation, commit-message drafting and release notes from commit history.
- Rust unit tests for redaction and the repository scanner; Vitest tests for
  route/path normalization.
- CI: `rust` job (rustfmt, clippy `-D warnings`, `cargo test`) and `desktop.yml`
  building installers on Windows, Linux and macOS. Previously CI never compiled
  the Rust side.
- ADR 0002 documenting the packaging and truthfulness decisions.

### Changed
- `OperatingManual` now carries `instructions`, `labels` and parsed
  `responsibilities`, `quality_standards` and `output_format`; the prompt
  compiler injects the verbatim operating manual (capped at 8 000 characters)
  instead of only identity and mission.
- Thinking-framework entries preserve their hierarchy (step headers with indented
  sub-questions) instead of flattening steps and questions into one numbered
  list; the renderer groups them again for display.
- Persona directories without a usable `persona.json` are logged by name instead
  of skipped silently.
- Workflow planning assigns real persona ids (`product-manager`,
  `software-architect`, `principal-engineer`) and adds a review task. The
  previous ids (`pm`, `architect`) matched nothing in the registry, so executing
  a planned task failed with "Persona not found".
- README rewritten to production standard: plain statement of what the product is
  and is not, honest feature-status table, persona catalogue, agent-interop
  section, per-OS quickstart, configuration and credential reference, packaging
  matrix, security model and an explicit limitations list.
  `packages/personas/README.md` rewritten as the persona file contract with the
  full 24-entry catalogue.

- Secret redaction now covers every message role on every provider path and
  reports a measured count surfaced in the UI and audit log.
- Gemini key moved from the URL query string to the `x-goog-api-key` header.
- CSP tightened: `unsafe-eval` removed, provider origins dropped from
  `connect-src`, Windows IPC origin (`http://ipc.localhost`) added.
- Static export switched to directory-style output (`trailingSlash`) for
  consistent deep-link resolution under WebView2 and WebKitGTK; all route
  comparisons normalized.
- Repository scanner now reports backend/database stacks and a file count;
  `Cargo.toml` is no longer misclassified as frontend.
- Navigation rail renders its icons again (the `asChild` implementation dropped
  them entirely); nav items expose accessible names and `aria-current`.
- Shortcut hints and keybindings are platform-correct (Ctrl on Windows/Linux).
- Memory dialogs persist ADRs and knowledge entries; fabricated "fallback" ADR
  and hard-coded dashboard statistics removed.
- Documentation (README, ROADMAP, ARCHITECTURE, GETTING_STARTED,
  PRODUCTION_READY) rewritten to claim only implemented behaviour; the synthetic
  "Final Engineering Review" is relabelled as AI-generated self-review.

### Fixed
- `backend-engineer` and `frontend-engineer` shipped `instructions.md` with no
  `persona.json`, so the loader silently skipped two of the advertised personas.
- `instructions.md` was never read at all: every behavioural rule the personas
  defined was discarded and the compiled prompt reduced to identity plus mission.
- `run_aos_completion` called `get_git_state_summary()` with no project argument
  while the function requires the open project, so the persona path could not
  compile.
- `start_repo_analysis` mixed `String` and `PathBuf` in a single match, another
  compile error on the intelligence path.
- The Ollama provider required an API key it ignores, so the offline path failed
  with "No API key is stored for 'ollama'".
- The AI Teammate sidebar numbered every framework line 1..N, rendering a
  five-step framework as twenty unrelated items.
- Four defects that only a real `cargo` run could surface, all in the desktop
  shell: three redaction regexes were written `r"...\\\"..."` — a backslash does
  not escape inside a raw string, so each literal ended early and the file did
  not parse; the command-discovery loop read `for (script, body) = ...` instead
  of `in`; `main.rs` called `app.manage(...)` without `use tauri::Manager`; and
  `extract_section` relied on lifetime elision Rust cannot infer from two `&str`
  inputs.
- `git/mod.rs` used two git2 APIs that do not exist in that shape: `find_branch`
  takes `BranchType`, not `Option<BranchType>` (the `Option` form belongs to
  `branches`), and the short-name resolver is `resolve_reference_from_short_name`.
- `tauri.conf.json` declared the bundled personas as `../../packages/personas`,
  which resolves to `apps/packages/personas` from `apps/desktop/src-tauri` and
  made the Tauri build script abort with "resource path doesn't exist" — every
  packaged build on Windows and Linux failed before compiling a line of Rust.
- `Cargo.lock` predated `tauri-plugin-dialog`, so a locked build could not
  resolve a dependency the crate declares.

### Removed
- Unsandboxed `run_python_tool` command (arbitrary code execution from the
  renderer with no permission checks).
- Unused dependencies `tree-sitter`, `walkdir`, `futures-util`; the README's
  Tree-sitter claim is withdrawn until real parsing lands.
- Dead duplicate modules (`aos::tools`, `aos::eval`, `orchestration::tasks`,
  `orchestration::tools`) that shadowed the real task/tool models.
- The placeholder `expect(true).toBe(true)` test.

### Security
- Renderer CSP and capabilities now enforce the documented local-first model.
- Website analysis refuses non-http(s) URLs and caps document size.
- Bumped the transitive Rust crates behind the advisories that had been failing
  the scheduled audit on `main` since August: `h2` 0.4.15 -> 0.4.16
  (RUSTSEC-2026-0258, unbounded empty DATA frames) and `rustls` 0.23.43 ->
  0.23.45 (RUSTSEC-2026-0285, TLS 1.3 handshake messages accepted across
  encryption-level boundaries), together with `rustls-webpki` 0.103.13 ->
  0.103.15, which rustls 0.23.45 requires. Lockfile-only bumps: the dependency
  sets of all three are unchanged.
- A `cargo fmt` / `clippy -D warnings` / `cargo test` job now gates every pull
  request. CI previously never compiled the Rust side, which is how the defects
  above survived.

## [0.1.0-alpha] — pre-audit baseline

### Added
- Initial monorepo foundation with pnpm and Turborepo.
- Comprehensive engineering documentation (Founding Charter, Architecture, Design System, Implementation Roadmap).
- Repository standards (Conventional Commits, Branching Strategy, CI/CD design).
- GitHub Issue and PR templates.

### Changed
- Standardized the toolchain on `pnpm@11` (workspace config, overrides, audit settings).
- Verified `lint`, `typecheck`, `test`, `build`, and Rust checks across all workspaces.
- Repaired the desktop Rust build and wired missing Tauri commands.
- Updated roadmap and contributing documentation to reflect current project state.
- Added MIT License.

### Security
- Remediated npm advisories via pnpm overrides (`sharp`, `postcss`); allowlisted an unpatched dev-only advisory (`GHSA-mh99-v99m-4gvg`).
- Zero cargo audit vulnerabilities (informational warnings only).
