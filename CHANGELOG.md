# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `list_project_files`: a capped, read-only walk of the open project (2000
  entries, 6 levels, skipping `.git`, dependency, build and cache directories)
  that reports when the cap cut it short. Seven Rust tests pin its ordering,
  skip list, path joining, depth clamping and entry budget.
- A real explorer and inspector in the shell: the left wing renders the tree the
  command returns, with a working name filter, expand/collapse, refresh and an
  "open a repository" affordance when nothing is open; the right wing shows the
  selected entry's name, kind, project-relative and absolute path, with a copy
  button that reports whether the webview allowed it.
- **Workflow Planner** on `/ai/aos`, surfacing `plan_aos_workflow` — implemented
  in the core but never called by any UI, under a tab that read "not yet
  implemented". The panel states that the decomposition is a fixed three-step
  scaffold and that nothing executes the tasks.
- Local git state, release-note drafting and a project scan on `/github`, all
  from commands that already existed in the core (`get_git_status`,
  `generate_github_release_notes`, `start_repo_analysis`) and had no UI.
- Settings → GitHub: save a personal access token to the OS credential store and
  check that it works, reporting how many repositories it can see.
- `tests/unit/git-engine.test.ts` (12 cases): asserts the exact command names and
  argument keys the SDK invokes, and reads `main.rs` to fail if any of them is
  missing from `generate_handler!`. Plus `tests/unit/tree.test.ts` (17 cases) for
  the tree helpers, and route-table tests that derive the expected route set from
  `apps/desktop/src/app/**/page.tsx` instead of restating it.
- `tests/stubs/tauri-core.ts`, aliased in `vitest.config.ts` and in the root
  `tsconfig.json` paths, so code that calls `invoke` can be unit-tested at all.
- A `build:bundles` label trigger on `desktop.yml`, so the three-platform bundle
  matrix can be proven on a pull request. It ran for the first time on this
  branch: Windows (NSIS + MSI), Linux (deb + rpm + AppImage) and macOS (app +
  dmg) all built.
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

- The four surviving plugins now register a palette command and publish an
  intent on the event bus, which is all a plugin can honestly do without a
  runtime. `web-intelligence` no longer publishes an `ANALYSIS_COMPLETED` event
  carrying a hard-coded "Mock result" report, and `workflow-pack` no longer logs
  an orchestration ("Reference Analyst -> UX Designer -> Frontend Engineer") it
  never performed against a hard-coded URL.
- `@blueprint/plugin-sdk`'s `PluginManifest` now matches the Rust struct that
  parses these files: `minBlueprintVersion` and `entrypoints` are optional, as
  they are in `src/plugins/manager.rs`.
- `@blueprint/types` is reduced to what genuinely crosses a package boundary -
  `GitHubRepository`, needed by both `@blueprint/git-engine` and the renderer,
  since a workspace package cannot import from an app. Command contracts live in
  `apps/desktop/src/lib/ipc.ts`, next to the code that calls them.
- `/` is now the project home: the open repository's branch, divergence, changed
  files, recent commits, file counts and the next actions available for it. It
  previously rendered "The projects engine is currently in development", reading
  a store field that no navigation ever updated.
- The `/workspace` route is gone. Blueprint opens one project at a time, so a
  second route for the same concept produced a placeholder page and a tab strip
  whose tab contents were never rendered by anything.
- `@blueprint/git-engine` is now the single typed surface for git and GitHub, and
  `apps/desktop/src/lib/ipc.ts` delegates to it. Both previously declared their
  own versions of the same commands and payload shapes, which is how they
  diverged.
- `@blueprint/types` no longer declares orchestration types; the live models are
  `OperatingManual` and `WorkflowTask` / `TaskGraph` in `ipc.ts`.
- The command palette navigates through the `ROUTES` map, so it cannot offer a
  route that does not exist, and every entry has a handler.
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

- `pnpm typecheck` never covered the root project, so `@blueprint/plugin-sdk`
  and everything under `plugins/` went unchecked in CI even though the root
  `tsconfig.json` includes them. The root script now runs `tsc --noEmit` on that
  project before delegating to turbo.
- `tauri.conf.json` pointed `licenseFile` at `../../LICENSE`, which resolves to
  `apps/LICENSE` — the same off-by-one class as the bundled personas path. The
  licence sits at the repository root, three levels up from `src-tauri`. Nothing
  caught it because the packaging workflow had never run.
- The GitHub repository mapping read `r.url` and `r.stars`, neither of which
  exists on the wire (GitHub sends `html_url` and `stargazers_count`), so
  repository links and star counts were silently `undefined`. The mapping now
  lives in `@blueprint/git-engine` under test.
- Fabricated data on `/github`: "Open PRs 12", "Build Success 98%", "Avg Review
  Time 4.2h" and "monitoring 5 repositories for secret exposure" were string
  literals in JSX. Nothing in Blueprint reads pull requests, CI runs or review
  times, and secret redaction happens in the AI path, not here. They are replaced
  by a footprint derived from the repositories the API actually returned and by
  the real repository scan.
- Settings → GitHub claimed the integration "is currently being scaffolded"
  behind a disabled button, while the Rust credential store's error message told
  users to add a token in exactly that tab.
- `ExecutionTimeline` compared against lowercase statuses (`'completed'`,
  `'waiting_approval'`) while the core serializes serde unit variants
  (`'Completed'`, `'Failed'`), and rendered `task.title` / `task.description`,
  which do not exist on the payload. Every branch of it was dead.
- The explorer's hardcoded `mockFiles` tree, shown whether or not a project was
  open.
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
  shell: three redaction regexes escaped a double quote inside a plain raw
  string, where a backslash is not an escape, so each literal ended early and
  the file did not parse; the command-discovery loop read
  `for (script, body) = ...` instead of `in`; `main.rs` called `app.manage(...)`
  without `use tauri::Manager`; and `extract_section` relied on lifetime elision
  Rust cannot infer from two `&str` inputs.
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

- Five manifest-only plugin directories - `api-explorer`, `arch-visualizer`,
  `db-inspector`, `deployment-intelligence` and `doc-intelligence`. Each
  declared `"entrypoints": { "frontend": "src/index.ts" }` for a file that did
  not exist, and requested permissions such as `fs.write` and `ai.complete` that
  nothing could have enforced or used. They are listed on the roadmap to return
  with implementations.
- Plugin SDK members with no host implementation: `WorkspaceAPI` (whose
  `openTab`/`closeTab` targeted the shell's removed tab strip), `AIAPI` (whose
  `complete` typed the core's object result as a string and whose
  `registerPersona` described registration for personas that are files on disk),
  `GitHubAPI` (whose `createIssue` invoked a command that does not exist), and
  `registerPanel` together with the store's unrendered `panels` registry. The
  `ui.tab`, `ui.panel` and `python.execute` permissions went with them. `git.write`
  stays: `create_git_branch` is a real write.
- The unused half of the plugin store: `plugins`, `initialize()` (never called by
  any component, so the array was always empty), `registerPlugin` and
  `publishEvent`. `commands` and `registerCommand` stay - the palette renders and
  invokes them.
- `packages/core` and `packages/brain`: one-line placeholders (`// Blueprint Core
Logic`, `// Blueprint Project Brain`) imported by nothing. The real brain is
  the Rust SQLite layer in `src/memory/`; a TypeScript package named after it
  only suggested otherwise.
- `packages/ai-adapters`: an unused second AI surface. Its `listModels()`
  returned a hardcoded two-model list ("Gemini 1.5 Flash", "Claude 3.5 Sonnet")
  that contradicted the core's provider routing, it accepted
  `temperature`/`maxTokens`/`topP`/`stop` options no command reads, and it typed
  `generate_ai_completion` as returning a string when the core returns an object
  - the exact drift `ipc.ts` was written to prevent.
- Most of `@blueprint/types`. Its AI, project-intelligence, memory and ADR types
  were duplicates that had drifted from the versions the app actually uses
  (`TechStack.language` versus the scanner's `languages`,
  `MemoryEntry.metadata?: string` versus the core's `string | null`), and
  `GitHubIssue` / `GitHubPullRequest` described payloads no command produces -
  the bait that four fabricated SDK methods were written against. Types for
  unimplemented capabilities now arrive with the commands that implement them.
- `get_personas` and `get_agent_roles`: two identical commands returning the same
  static role list, called by nothing, along with the `ai/orchestration/` module
  that existed only to serve them. The filesystem registry behind
  `get_operating_manuals` is the single source of truth for personas.
- `commit`, `push`, `listIssues` and `createPullRequest` from
  `@blueprint/git-engine`. They invoked `create_git_commit`, `push_git_changes`,
  `list_github_issues` and `create_github_pull_request`, none of which the core
  implements, so all four rejected at runtime with "command not found" — and
  since nothing imported the package, nothing ever noticed.
- The stale `AgentRoleId` union (13 ids such as `'architect'` and `'pm'` that
  were never persona ids, while omitting all 24 that are), and the unused
  `Persona` / `Task` / `TaskGraph` types keyed to it.
- Dead controls: "Run Full Audit" and the repository external-link button on
  `/github`, "Disable" on installed plugins, "Explore Impact" on an ADR, and
  "New Blueprint Project" in the palette. A control that cannot act is worse than
  no control.
- The workspace tab system (`tabs`, `activeTabId`, `WorkspaceTabs`) and the dead
  `activeSystem` / `activeProjectId` store fields that duplicated route and
  project state the router and the Rust `ProjectContext` already own.
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
